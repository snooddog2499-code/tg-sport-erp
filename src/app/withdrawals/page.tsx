import { db, schema } from "@/db";
import { desc, eq, gte, sql, sum } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatDateTH, formatBaht } from "@/lib/format";
import { DEPT_LABELS, type WithdrawalDept } from "@/lib/withdrawal-types";
import WithdrawForm from "./withdraw-form";
import DeleteButton from "./delete-button";
import { PackageMinus, History, TrendingDown, Building2 } from "lucide-react";

export const metadata = { title: "เบิกวัตถุดิบ — TG Sport ERP" };

// Force dynamic — withdrawals data changes frequently
export const dynamic = "force-dynamic";

export default async function WithdrawalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "material:use")) redirect("/forbidden");

  const canManage = can(user.role, "material:manage");

  // Today's start (UTC midnight is fine for daily aggregation)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Latest 100 withdrawals with material + user joins
  const recent = await db
    .select({
      id: schema.materialWithdrawals.id,
      materialId: schema.materialWithdrawals.materialId,
      qty: schema.materialWithdrawals.qty,
      dept: schema.materialWithdrawals.dept,
      orderId: schema.materialWithdrawals.orderId,
      note: schema.materialWithdrawals.note,
      withdrawnAt: schema.materialWithdrawals.withdrawnAt,
      materialName: schema.materials.name,
      materialUnit: schema.materials.unit,
      costPerUnit: schema.materials.costPerUnit,
      userName: schema.users.name,
      orderCode: schema.orders.code,
    })
    .from(schema.materialWithdrawals)
    .leftJoin(
      schema.materials,
      eq(schema.materialWithdrawals.materialId, schema.materials.id)
    )
    .leftJoin(
      schema.users,
      eq(schema.materialWithdrawals.withdrawnBy, schema.users.id)
    )
    .leftJoin(
      schema.orders,
      eq(schema.materialWithdrawals.orderId, schema.orders.id)
    )
    .orderBy(desc(schema.materialWithdrawals.withdrawnAt))
    .limit(100);

  // Today's aggregates
  const [todayStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalCost: sql<number>`coalesce(sum(${schema.materialWithdrawals.qty} * ${schema.materials.costPerUnit}), 0)::float`,
    })
    .from(schema.materialWithdrawals)
    .leftJoin(
      schema.materials,
      eq(schema.materialWithdrawals.materialId, schema.materials.id)
    )
    .where(
      gte(
        schema.materialWithdrawals.withdrawnAt,
        todayStart.toISOString()
      )
    );

  // Top dept this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const byDept = await db
    .select({
      dept: schema.materialWithdrawals.dept,
      total: sum(schema.materialWithdrawals.qty),
    })
    .from(schema.materialWithdrawals)
    .where(gte(schema.materialWithdrawals.withdrawnAt, weekStart.toISOString()))
    .groupBy(schema.materialWithdrawals.dept)
    .orderBy(desc(sum(schema.materialWithdrawals.qty)))
    .limit(1);

  const topDept = byDept[0]?.dept as WithdrawalDept | undefined;

  // Materials list for the form
  const materials = await db
    .select({
      id: schema.materials.id,
      name: schema.materials.name,
      unit: schema.materials.unit,
      stock: schema.materials.stock,
    })
    .from(schema.materials)
    .orderBy(schema.materials.name);

  // Active orders for optional linkage (non-completed)
  const activeOrders = await db
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
    })
    .from(schema.orders)
    .where(
      sql`${schema.orders.status} not in ('completed', 'cancelled', 'delivered')`
    )
    .orderBy(desc(schema.orders.createdAt))
    .limit(50);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            เบิกวัตถุดิบ
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            เบิกของไปใช้ในแต่ละแผนก — สต็อกหักลบอัตโนมัติทันที
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <History size={13} />
            เบิกวันนี้
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {todayStats?.count ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">รายการ</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <TrendingDown size={13} />
            มูลค่าเบิกวันนี้
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {formatBaht(todayStats?.totalCost ?? 0)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">ประมาณการต้นทุน</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Building2 size={13} />
            แผนกเบิกบ่อยสุด (7 วัน)
          </div>
          <p className="text-2xl font-bold text-ink-900">
            {topDept ? DEPT_LABELS[topDept] : "-"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            ตามจำนวนรวมที่เบิก
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="card p-4 md:p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
          <PackageMinus size={15} className="text-brand-600" />
          เบิกของใหม่
        </h2>
        <WithdrawForm
          materials={materials}
          orders={activeOrders}
          userRole={user.role}
        />
      </section>

      {/* History table */}
      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
          <h2 className="text-sm font-semibold text-ink-900">
            ประวัติเบิก (100 รายการล่าสุด)
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center">
            <PackageMinus
              size={40}
              className="mx-auto text-zinc-300 mb-3"
            />
            <p className="text-sm text-zinc-500">ยังไม่มีการเบิก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">เวลา</th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    วัตถุดิบ
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">จำนวน</th>
                  <th className="text-left px-3 py-2.5 font-medium">แผนก</th>
                  <th className="text-left px-3 py-2.5 font-medium">โดย</th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    ผูกออเดอร์
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">หมายเหตุ</th>
                  {canManage && <th className="px-3 py-2.5"></th>}
                </tr>
              </thead>
              <tbody>
                {recent.map((w) => {
                  const cost =
                    (w.qty ?? 0) * (w.costPerUnit ?? 0);
                  return (
                    <tr
                      key={w.id}
                      className="border-t border-zinc-100 hover:bg-zinc-50/50"
                    >
                      <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {formatDateTH(w.withdrawnAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink-900">
                          {w.materialName ?? "?"}
                        </div>
                        {cost > 0 && (
                          <div className="text-[10px] text-zinc-400 tabular-nums">
                            ≈ {formatBaht(cost)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-ink-900">
                        {w.qty}{" "}
                        <span className="text-xs text-zinc-500 font-normal">
                          {w.materialUnit}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center text-xs font-medium text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                          {DEPT_LABELS[w.dept as WithdrawalDept] ?? w.dept}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-zinc-600 text-xs">
                        {w.userName ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-600">
                        {w.orderCode ? (
                          <a
                            href={`/orders/${w.orderId}`}
                            className="text-brand-600 hover:underline"
                          >
                            {w.orderCode}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                        {w.note ?? "-"}
                      </td>
                      {canManage && (
                        <td className="px-3 py-3 text-right">
                          <DeleteButton id={w.id} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
