import { db, schema } from "@/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { formatBaht } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can, requirePerm } from "@/lib/permissions";
import { Store, UserPlus, Percent } from "lucide-react";

export const metadata = { title: "ตัวแทน — TG Sport ERP" };

export default async function DealersPage() {
  await requirePerm("dealer:manage");
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const dealers = await db
    .select({
      id: schema.dealers.id,
      name: schema.dealers.name,
      phone: schema.dealers.phone,
      commissionPct: schema.dealers.commissionPct,
      discountPct: schema.dealers.discountPct,
      active: schema.dealers.active,
      monthSales:
        sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.total} else 0 end), 0)`.mapWith(
          Number
        ),
      monthCommission:
        sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.dealerCommission} else 0 end), 0)`.mapWith(
          Number
        ),
      totalOrders:
        sql<number>`count(case when ${schema.orders.id} is not null then 1 end)`.mapWith(
          Number
        ),
    })
    .from(schema.dealers)
    .leftJoin(schema.orders, eq(schema.orders.dealerId, schema.dealers.id))
    .groupBy(schema.dealers.id)
    .orderBy(asc(schema.dealers.name));

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "dealer:manage");

  const totalMonthSales = dealers.reduce((s, d) => s + d.monthSales, 0);
  const totalMonthCommission = dealers.reduce(
    (s, d) => s + d.monthCommission,
    0
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Store size={24} /> ตัวแทนจำหน่าย
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {dealers.filter((d) => d.active).length} รายเปิดอยู่
          </p>
        </div>
        {canManage && (
          <Link href="/dealers/new" className="btn btn-brand btn-sm">
            <UserPlus size={14} strokeWidth={2.5} />
            เพิ่มตัวแทน
          </Link>
        )}
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Store size={13} />
            ตัวแทนทั้งหมด
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {dealers.length}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Percent size={13} />
            ยอดขายเดือนนี้ (ผ่านตัวแทน)
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {formatBaht(totalMonthSales)}
          </p>
        </div>
        <div className="card p-4 border-amber-200">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Percent size={13} />
            Commission ค้างจ่าย (เดือนนี้)
          </div>
          <p className="text-2xl font-bold text-amber-700 tabular-nums">
            {formatBaht(totalMonthCommission)}
          </p>
        </div>
      </section>

      <section className="card overflow-hidden">
        {dealers.length === 0 ? (
          <div className="p-12 text-center">
            <Store size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500 mb-3">ยังไม่มีตัวแทน</p>
            {canManage && (
              <Link href="/dealers/new" className="btn btn-brand btn-sm">
                <UserPlus size={13} />
                เพิ่มรายแรก
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">ชื่อ</th>
                  <th className="text-left px-3 py-2.5 font-medium">ติดต่อ</th>
                  <th className="text-right px-3 py-2.5 font-medium">Discount</th>
                  <th className="text-right px-3 py-2.5 font-medium">Commission</th>
                  <th className="text-right px-3 py-2.5 font-medium">ออเดอร์</th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    ยอด/Commission (เดือนนี้)
                  </th>
                  <th className="text-center px-3 py-2.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dealers/${d.id}`}
                        className="font-medium text-ink-900 hover:text-brand-600"
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {d.phone ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-xs">
                      {d.discountPct}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-xs">
                      {d.commissionPct}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {d.totalOrders}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      <div className="tabular-nums font-medium">
                        {formatBaht(d.monthSales)}
                      </div>
                      <div className="tabular-nums text-amber-700">
                        {formatBaht(d.monthCommission)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`badge-plain ${
                          d.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {d.active ? "เปิด" : "ปิด"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
