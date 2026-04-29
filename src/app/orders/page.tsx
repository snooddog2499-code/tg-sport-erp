import Link from "next/link";
import { db, schema } from "@/db";
import { desc, eq, inArray, or, like, and, sql, type SQL } from "drizzle-orm";
import {
  formatBaht,
  formatDateTH,
  stageLabels,
  statusColors,
  statusLabels,
} from "@/lib/format";
import {
  Palette,
  Printer,
  Flame,
  Scissors,
  Shirt,
  ShieldCheck,
  Package,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductionStage } from "@/db/schema";
import RoleAvatar from "@/components/RoleAvatar";

const stageIcon: Record<ProductionStage, LucideIcon> = {
  graphic: Palette,
  print: Printer,
  roll: Flame,
  laser: Scissors,
  sew: Shirt,
  qc: ShieldCheck,
  pack: Package,
  ship: Truck,
};

const stageIconColor: Record<ProductionStage, string> = {
  graphic: "text-pink-600",
  print: "text-sky-600",
  roll: "text-orange-600",
  laser: "text-indigo-600",
  sew: "text-teal-600",
  qc: "text-emerald-600",
  pack: "text-amber-700",
  ship: "text-ink-900",
};
import { getCurrentUser } from "@/lib/auth";
import SearchBar from "./search-bar";
import PipelineSummary from "./pipeline-summary";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  const user = await getCurrentUser();
  const isDealer = user?.role === "dealer";

  const filters: SQL[] = [];
  if (isDealer && user?.dealerId) {
    filters.push(eq(schema.orders.dealerId, user.dealerId));
  }
  if (q.trim()) {
    const trimmed = q.trim();
    const term = `%${trimmed}%`;
    const lower = trimmed.toLowerCase();
    const matchedStatuses = (
      Object.entries(statusLabels) as Array<[string, string]>
    )
      .filter(
        ([k, label]) =>
          label.toLowerCase().includes(lower) ||
          k.toLowerCase().includes(lower)
      )
      .map(([k]) => k);

    const conditions: SQL[] = [
      like(schema.orders.code, term)!,
      like(schema.customers.name, term)!,
      like(schema.orders.notes, term)!,
    ];
    if (matchedStatuses.length > 0) {
      conditions.push(
        inArray(
          schema.orders.status,
          matchedStatuses as Array<
            (typeof schema.orders.$inferSelect)["status"]
          >
        )
      );
    }
    filters.push(or(...conditions)!);
  }

  const orders = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      status: schema.orders.status,
      deadline: schema.orders.deadline,
      total: schema.orders.total,
      deposit: schema.orders.deposit,
      paid: schema.orders.paid,
      createdAt: schema.orders.createdAt,
      createdById: schema.orders.createdBy,
      createdByName: schema.users.name,
      createdByRole: schema.users.role,
      customerName: schema.customers.name,
    })
    .from(schema.orders)
    .leftJoin(schema.customers, eq(schema.orders.customerId, schema.customers.id))
    .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.orders.createdAt));

  // Map orderId → total qty
  const qtyRows = await db
    .select({
      orderId: schema.orderItems.orderId,
      total: sql<number>`coalesce(sum(${schema.orderItems.qty}), 0)`.mapWith(
        Number
      ),
    })
    .from(schema.orderItems)
    .groupBy(schema.orderItems.orderId);
  const qtyByOrder = new Map(qtyRows.map((r) => [r.orderId, r.total]));

  // Map orderId → active stage (if any)
  const activeStages = await db
    .select({
      orderId: schema.productionStages.orderId,
      stage: schema.productionStages.stage,
    })
    .from(schema.productionStages)
    .where(eq(schema.productionStages.status, "active"));
  const activeStageByOrder = new Map(
    activeStages.map((s) => [s.orderId, s.stage])
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">ออเดอร์ทั้งหมด</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {orders.length} ใบ
            {q && <span className="text-zinc-400"> (กรองอยู่)</span>}
          </p>
        </div>
        <Link
          href="/orders/new"
          className="px-4 py-2 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800"
        >
          + รับออเดอร์ใหม่
        </Link>
      </header>

      {!isDealer && <PipelineSummary />}

      <SearchBar initialQ={q} />

      {orders.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center text-sm text-zinc-500">
          {q ? "ไม่พบออเดอร์ตามเงื่อนไข" : "ยังไม่มีออเดอร์"}
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">รหัส</th>
                  <th className="text-left px-5 py-2 font-medium">ลูกค้า</th>
                  <th className="text-left px-5 py-2 font-medium">สถานะ</th>
                  <th className="text-left px-5 py-2 font-medium">ขั้นตอน</th>
                  <th className="text-left px-5 py-2 font-medium">Deadline</th>
                  <th className="text-right px-5 py-2 font-medium">จำนวนตัว</th>
                  <th className="text-right px-5 py-2 font-medium">ยอด</th>
                  <th className="text-right px-5 py-2 font-medium">มัดจำ</th>
                  <th className="text-right px-5 py-2 font-medium">ชำระแล้ว</th>
                  <th className="text-right px-5 py-2 font-medium">คงเหลือ</th>
                  <th className="text-left px-5 py-2 font-medium">ผู้บันทึก</th>
                  <th className="text-left px-5 py-2 font-medium">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{o.customerName ?? "-"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[o.status]}`}
                      >
                        {statusLabels[o.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {(() => {
                        const stage = activeStageByOrder.get(o.id);
                        if (o.status === "ready")
                          return (
                            <span className="text-emerald-700 font-medium">
                              พร้อมส่ง ✓
                            </span>
                          );
                        if (o.status === "delivered" || o.status === "paid")
                          return (
                            <span className="text-zinc-400">เสร็จสิ้น</span>
                          );
                        if (o.status === "cancelled")
                          return (
                            <span className="text-red-500">ยกเลิก</span>
                          );
                        if (!stage)
                          return (
                            <span className="text-zinc-400">รอเริ่ม</span>
                          );
                        const Icon = stageIcon[stage];
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon
                              size={14}
                              strokeWidth={2.25}
                              className={stageIconColor[stage]}
                            />
                            <span className="text-ink-900 font-medium">
                              {stageLabels[stage]}
                            </span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {formatDateTH(o.deadline)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {(() => {
                        const q = qtyByOrder.get(o.id) ?? 0;
                        return q > 0 ? (
                          <span className="text-ink-900 font-medium">
                            {q.toLocaleString("th-TH")}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatBaht(o.total)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-600">
                      {(o.deposit ?? 0) > 0 ? formatBaht(o.deposit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-700">
                      {(o.paid ?? 0) > 0 ? formatBaht(o.paid) : "—"}
                    </td>
                    {(() => {
                      const bal =
                        (o.total ?? 0) -
                        Math.max(o.paid ?? 0, o.deposit ?? 0);
                      return (
                        <td
                          className={`px-5 py-3 text-right tabular-nums font-medium ${
                            bal > 0 ? "text-amber-700" : "text-zinc-400"
                          }`}
                        >
                          {bal > 0 ? formatBaht(bal) : "✓"}
                        </td>
                      );
                    })()}
                    <td className="px-5 py-3 text-xs">
                      {o.createdByName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <RoleAvatar
                            role={o.createdByRole ?? "admin"}
                            size="xs"
                          />
                          <span className="text-zinc-700">
                            {o.createdByName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {formatDateTH(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block bg-white border border-zinc-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-zinc-600">
                    {o.code}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[o.status]}`}
                  >
                    {statusLabels[o.status as keyof typeof statusLabels]}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">
                  {o.customerName ?? "-"}
                </p>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>กำหนด: {formatDateTH(o.deadline)}</span>
                  <span className="tabular-nums">
                    {(qtyByOrder.get(o.id) ?? 0) > 0 && (
                      <>{qtyByOrder.get(o.id)} ตัว · </>
                    )}
                    {formatBaht(o.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
