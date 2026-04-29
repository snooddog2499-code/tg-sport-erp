import { db, schema } from "@/db";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatBaht, formatDateTH, statusColors, statusLabels } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can, requirePerm } from "@/lib/permissions";
import { Pencil, UserCheck, UserX, Store, Percent } from "lucide-react";
import { toggleDealerActive } from "@/actions/dealers";
import { listDealerPrices } from "@/actions/dealer-prices";
import PriceTable from "./price-table";

export default async function DealerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  await requirePerm("dealer:manage");
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [dealer] = await db
    .select()
    .from(schema.dealers)
    .where(eq(schema.dealers.id, id));
  if (!dealer) notFound();

  const sp = await searchParams;
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = sp?.month ?? currentYm;
  const [yy, mm] = ym.split("-").map(Number);
  const monthStart = new Date(yy, mm - 1, 1).toISOString();
  const monthEnd = new Date(yy, mm, 1).toISOString();

  const orders = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      status: schema.orders.status,
      total: schema.orders.total,
      paid: schema.orders.paid,
      dealerDiscount: schema.orders.dealerDiscount,
      dealerCommission: schema.orders.dealerCommission,
      createdAt: schema.orders.createdAt,
      updatedAt: schema.orders.updatedAt,
      customerName: schema.customers.name,
    })
    .from(schema.orders)
    .leftJoin(
      schema.customers,
      eq(schema.orders.customerId, schema.customers.id)
    )
    .where(eq(schema.orders.dealerId, id))
    .orderBy(desc(schema.orders.createdAt))
    .limit(30);

  const monthOrders = orders.filter(
    (o) =>
      (o.status === "delivered" || o.status === "paid") &&
      o.updatedAt >= monthStart &&
      o.updatedAt < monthEnd
  );
  const monthSales = monthOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const monthCommission = monthOrders.reduce(
    (s, o) => s + (o.dealerCommission ?? 0),
    0
  );

  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "dealer:manage");

  const prices = await listDealerPrices(id);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link href="/dealers" className="text-xs text-zinc-500 hover:text-ink-900">
        ← ตัวแทนทั้งหมด
      </Link>

      <header className="mt-2 mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Store size={22} /> {dealer.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {dealer.phone && `โทร ${dealer.phone}`}
            {dealer.lineId && ` · LINE ${dealer.lineId}`}
            {dealer.email && ` · ${dealer.email}`}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/dealers/${id}/edit`} className="btn btn-outline btn-sm">
              <Pencil size={12} />
              แก้ไข
            </Link>
            <form
              action={async () => {
                "use server";
                await toggleDealerActive(id);
              }}
            >
              <button
                type="submit"
                className={`btn btn-sm ${
                  dealer.active ? "btn-outline" : "btn-brand"
                }`}
              >
                {dealer.active ? (
                  <>
                    <UserX size={12} /> ปิดการใช้งาน
                  </>
                ) : (
                  <>
                    <UserCheck size={12} /> เปิดการใช้งาน
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Stat
          icon={Percent}
          label="ส่วนลดราคาส่ง"
          value={`${dealer.discountPct}%`}
        />
        <Stat
          icon={Percent}
          label="Commission"
          value={`${dealer.commissionPct}%`}
        />
        <Stat
          label="ยอดขาย (เดือนนี้)"
          value={formatBaht(monthSales)}
          tone="brand"
        />
        <Stat
          label="Commission (เดือนนี้)"
          value={formatBaht(monthCommission)}
          tone="amber"
        />
      </section>

      <section className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-ink-900 text-sm">
            สรุปรายเดือน
          </h2>
          <div className="flex gap-1 flex-wrap">
            {months.map((m) => (
              <Link
                key={m}
                href={`?month=${m}`}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  m === ym
                    ? "bg-ink-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {m}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          ออเดอร์ที่ส่งแล้ว/จ่ายครบในเดือนนั้น — ใช้คำนวณ commission ค้างจ่าย
        </p>
      </section>

      <PriceTable dealerId={id} prices={prices} canManage={canManage} />

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-ink-900 text-sm">
            ออเดอร์ล่าสุด ({orders.length})
          </h2>
        </div>
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">ยังไม่มีออเดอร์</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">รหัส</th>
                  <th className="text-left px-3 py-2.5 font-medium">ลูกค้า</th>
                  <th className="text-left px-3 py-2.5 font-medium">สถานะ</th>
                  <th className="text-right px-3 py-2.5 font-medium">ยอด</th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    Commission
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-xs text-brand-600 hover:text-brand-700"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {o.customerName ?? "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`badge-plain ${statusColors[o.status]}`}
                      >
                        {statusLabels[o.status as keyof typeof statusLabels]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatBaht(o.total)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-amber-700">
                      {formatBaht(o.dealerCommission ?? 0)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-zinc-500">
                      {formatDateTH(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dealer.note && (
        <section className="card p-5 mt-6">
          <h2 className="font-semibold text-ink-900 text-sm mb-2">หมายเหตุ</h2>
          <p className="text-sm text-zinc-700 whitespace-pre-line">
            {dealer.note}
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon?: typeof Store;
  label: string;
  value: string;
  tone?: "brand" | "amber";
}) {
  return (
    <div
      className={`card p-4 ${
        tone === "brand"
          ? "bg-brand-50/60 border-brand-200"
          : tone === "amber"
            ? "bg-amber-50/60 border-amber-200"
            : ""
      }`}
    >
      <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <p
        className={`text-xl md:text-2xl font-bold tabular-nums ${
          tone === "brand"
            ? "text-brand-700"
            : tone === "amber"
              ? "text-amber-700"
              : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
