import { db, schema } from "@/db";
import { and, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import { requirePerm } from "@/lib/permissions";
import { formatBaht, statusLabels, stageLabels } from "@/lib/format";
import { BarChart3, TrendingUp, Users, Factory } from "lucide-react";
import type { ProductionStage } from "@/db/schema";
import Link from "next/link";

export const metadata = { title: "รายงาน — TG Sport ERP" };

export default async function ReportsPage() {
  await requirePerm("reports:view");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const [
    monthRevenue,
    yearRevenue,
    ordersByStatus,
    topCustomers,
    monthlyRevenue,
    stageDurations,
    dealerSales,
  ] = await Promise.all([
    db
      .select({ total: sum(schema.orders.total) })
      .from(schema.orders)
      .where(
        and(
          inArray(schema.orders.status, ["delivered", "paid"]),
          gte(schema.orders.updatedAt, monthStart)
        )
      ),
    db
      .select({ total: sum(schema.orders.total) })
      .from(schema.orders)
      .where(
        and(
          inArray(schema.orders.status, ["delivered", "paid"]),
          gte(schema.orders.updatedAt, yearStart)
        )
      ),
    db
      .select({
        status: schema.orders.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.orders)
      .groupBy(schema.orders.status),
    db
      .select({
        customerId: schema.orders.customerId,
        customerName: schema.customers.name,
        orderCount: sql<number>`count(*)`.mapWith(Number),
        totalRevenue:
          sql<number>`coalesce(sum(${schema.orders.total}), 0)`.mapWith(Number),
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id)
      )
      .groupBy(schema.orders.customerId)
      .orderBy(desc(sql`sum(${schema.orders.total})`))
      .limit(5),
    db
      .select({
        ym: sql<string>`to_char(${schema.orders.updatedAt}::timestamptz, 'YYYY-MM')`.mapWith(
          String
        ),
        total:
          sql<number>`coalesce(sum(${schema.orders.total}), 0)`.mapWith(Number),
      })
      .from(schema.orders)
      .where(inArray(schema.orders.status, ["delivered", "paid"]))
      .groupBy(
        sql`to_char(${schema.orders.updatedAt}::timestamptz, 'YYYY-MM')`
      )
      .orderBy(
        desc(
          sql`to_char(${schema.orders.updatedAt}::timestamptz, 'YYYY-MM')`
        )
      )
      .limit(6),
    db
      .select({
        stage: schema.productionStages.stage,
        // Postgres replacement for the old SQLite julianday() math:
        // EXTRACT(EPOCH FROM interval) returns seconds — divide by 3600
        // to get hours. completedAt and startedAt are stored as strings
        // (text columns) so we cast both to timestamptz before subtract.
        avgHours: sql<number>`avg(
          extract(epoch from (
            ${schema.productionStages.completedAt}::timestamptz
            - ${schema.productionStages.startedAt}::timestamptz
          )) / 3600.0
        )`.mapWith(Number),
        completed: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.productionStages)
      .where(
        and(
          eq(schema.productionStages.status, "done"),
          sql`${schema.productionStages.startedAt} is not null`,
          sql`${schema.productionStages.completedAt} is not null`
        )
      )
      .groupBy(schema.productionStages.stage),
    db
      .select({
        dealerId: schema.dealers.id,
        dealerName: schema.dealers.name,
        orderCount: sql<number>`count(${schema.orders.id})`.mapWith(Number),
        sales:
          sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.total} else 0 end), 0)`.mapWith(
            Number
          ),
        commission:
          sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.dealerCommission} else 0 end), 0)`.mapWith(
            Number
          ),
      })
      .from(schema.dealers)
      .leftJoin(schema.orders, eq(schema.orders.dealerId, schema.dealers.id))
      .groupBy(schema.dealers.id)
      .orderBy(desc(sql`sum(${schema.orders.total})`))
      .limit(10),
  ]);

  const monthTotal = Number(monthRevenue[0]?.total ?? 0);
  const yearTotal = Number(yearRevenue[0]?.total ?? 0);
  const totalOrders = ordersByStatus.reduce((s, r) => s + r.count, 0);
  const maxMonthlyRevenue = Math.max(
    1,
    ...monthlyRevenue.map((r) => Number(r.total))
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
          <BarChart3 size={24} /> รายงาน
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          ข้อมูลสรุปการดำเนินงาน (ตัดตาม updatedAt ของออเดอร์สถานะ delivered/paid)
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatCard
          icon={TrendingUp}
          tone="brand"
          label="ยอดขายเดือนนี้"
          value={formatBaht(monthTotal)}
        />
        <StatCard
          icon={TrendingUp}
          tone="emerald"
          label={`ยอดขายปี ${now.getFullYear()}`}
          value={formatBaht(yearTotal)}
        />
        <StatCard
          icon={Users}
          tone="purple"
          label="ออเดอร์รวม"
          value={String(totalOrders)}
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h2 className="font-semibold text-ink-900 text-sm mb-3">
            ยอดขายรายเดือน (6 เดือนล่าสุด)
          </h2>
          {monthlyRevenue.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <ul className="space-y-2">
              {monthlyRevenue.map((r) => {
                const total = Number(r.total);
                const pct = (total / maxMonthlyRevenue) * 100;
                return (
                  <li key={r.ym}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-zinc-600 font-mono">{r.ym}</span>
                      <span className="font-semibold tabular-nums">
                        {formatBaht(total)}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-ink-900 text-sm mb-3">
            ออเดอร์แยกตามสถานะ
          </h2>
          <ul className="space-y-1.5">
            {ordersByStatus.map((r) => {
              const label =
                statusLabels[r.status as keyof typeof statusLabels] ?? r.status;
              return (
                <li
                  key={r.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-600">{label}</span>
                  <span className="font-semibold tabular-nums">{r.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-ink-900 text-sm">
            Top 5 ลูกค้า (ตามยอดขายรวม)
          </h2>
        </div>
        {topCustomers.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">ยังไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">ลูกค้า</th>
                <th className="text-right px-3 py-2.5 font-medium">ออเดอร์</th>
                <th className="text-right px-5 py-2.5 font-medium">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c) => (
                <tr
                  key={c.customerId}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/customers/${c.customerId}`}
                      className="text-ink-900 hover:text-brand-600"
                    >
                      {c.customerName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {c.orderCount}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {formatBaht(Number(c.totalRevenue))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {dealerSales.length > 0 && (
        <section className="card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-ink-900 text-sm">
              ยอดขายผ่านตัวแทน (เดือนนี้)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Commission ค้างจ่ายเดือนนี้
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">ตัวแทน</th>
                <th className="text-right px-3 py-2.5 font-medium">ออเดอร์</th>
                <th className="text-right px-3 py-2.5 font-medium">ยอดขาย</th>
                <th className="text-right px-5 py-2.5 font-medium">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {dealerSales.map((d) => (
                <tr
                  key={d.dealerId}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/dealers/${d.dealerId}`}
                      className="text-ink-900 hover:text-brand-600"
                    >
                      {d.dealerName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {d.orderCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatBaht(Number(d.sales))}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-amber-700">
                    {formatBaht(Number(d.commission))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Factory size={16} className="text-zinc-500" />
          <h2 className="font-semibold text-ink-900 text-sm">
            เวลาเฉลี่ยในแต่ละสเตจการผลิต
          </h2>
        </div>
        {stageDurations.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            ยังไม่มีสเตจที่เสร็จสิ้น
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stageDurations.map((s) => (
              <li
                key={s.stage}
                className="p-3 rounded-lg bg-zinc-50 border border-zinc-200"
              >
                <p className="text-xs text-zinc-500">
                  {stageLabels[s.stage as ProductionStage] ?? s.stage}
                </p>
                <p className="text-lg font-bold tabular-nums text-ink-900">
                  {Number(s.avgHours ?? 0).toFixed(1)} ชม.
                </p>
                <p className="text-[10px] text-zinc-500">
                  เฉลี่ยจาก {s.completed} ครั้ง
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof BarChart3;
  tone: "brand" | "emerald" | "purple";
  label: string;
  value: string;
}) {
  const toneMap: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>
      </div>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-ink-900 mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}
