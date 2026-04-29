import { db, schema } from "@/db";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatBaht, formatDateTH, statusColors, statusLabels } from "@/lib/format";
import {
  Store,
  PlusCircle,
  Percent,
  ShoppingBag,
  Calendar,
} from "lucide-react";

export const metadata = { title: "แดชบอร์ดตัวแทน — TG Sport ERP" };

export default async function DealerPortalPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "dealer" || !user.dealerId) notFound();

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const [dealer] = await db
    .select()
    .from(schema.dealers)
    .where(eq(schema.dealers.id, user.dealerId));
  if (!dealer) notFound();

  const [myOrders, totals] = await Promise.all([
    db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        status: schema.orders.status,
        total: schema.orders.total,
        dealerCommission: schema.orders.dealerCommission,
        deadline: schema.orders.deadline,
        createdAt: schema.orders.createdAt,
        customerName: schema.customers.name,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id)
      )
      .where(eq(schema.orders.dealerId, user.dealerId))
      .orderBy(desc(schema.orders.createdAt))
      .limit(10),
    db
      .select({
        allOrders: sql<number>`count(*)`.mapWith(Number),
        monthSales:
          sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.total} else 0 end), 0)`.mapWith(
            Number
          ),
        monthCommission:
          sql<number>`coalesce(sum(case when ${schema.orders.status} in ('delivered','paid') and ${schema.orders.updatedAt} >= ${monthStart} then ${schema.orders.dealerCommission} else 0 end), 0)`.mapWith(
            Number
          ),
        activeOrders:
          sql<number>`count(case when ${schema.orders.status} in ('received','quoted','approved','in_production','qc','ready') then 1 end)`.mapWith(
            Number
          ),
      })
      .from(schema.orders)
      .where(eq(schema.orders.dealerId, user.dealerId)),
  ]);

  const summary = totals[0];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 md:mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Store size={22} /> แดชบอร์ดตัวแทน
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            สวัสดีคุณ{" "}
            <span className="font-medium text-ink-900">{dealer.name}</span> —
            Discount {dealer.discountPct}% · Commission {dealer.commissionPct}%
          </p>
        </div>
        <Link href="/orders/new" className="btn btn-brand btn-sm">
          <PlusCircle size={14} strokeWidth={2.5} />
          สั่งออเดอร์ใหม่
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Stat
          icon={ShoppingBag}
          label="ออเดอร์กำลังทำ"
          value={String(summary?.activeOrders ?? 0)}
        />
        <Stat
          icon={ShoppingBag}
          label="ออเดอร์ทั้งหมด"
          value={String(summary?.allOrders ?? 0)}
        />
        <Stat
          icon={Calendar}
          label="ยอดขาย (เดือนนี้)"
          value={formatBaht(Number(summary?.monthSales ?? 0))}
          tone="brand"
        />
        <Stat
          icon={Percent}
          label="Commission (เดือนนี้)"
          value={formatBaht(Number(summary?.monthCommission ?? 0))}
          tone="amber"
        />
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-900 text-sm">
              ออเดอร์ของคุณ
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">10 รายการล่าสุด</p>
          </div>
          <Link
            href="/orders"
            className="text-xs text-zinc-600 hover:text-ink-900"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        {myOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            ยังไม่มีออเดอร์ —{" "}
            <Link href="/orders/new" className="text-brand-600 hover:underline">
              สั่งออเดอร์แรก
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {myOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-500 w-24 flex-shrink-0">
                    {o.code}
                  </span>
                  <span className="flex-1 truncate">{o.customerName}</span>
                  <span
                    className={`badge-plain ${statusColors[o.status]} flex-shrink-0`}
                  >
                    {statusLabels[o.status as keyof typeof statusLabels]}
                  </span>
                  <span className="text-xs text-zinc-500 w-24 text-right hidden sm:inline">
                    {formatDateTH(o.deadline)}
                  </span>
                  <span className="tabular-nums font-semibold text-ink-900 w-24 text-right">
                    {formatBaht(o.total)}
                  </span>
                  <span className="tabular-nums text-xs text-amber-700 w-20 text-right">
                    +{formatBaht(o.dealerCommission ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  tone?: "brand" | "amber";
}) {
  const toneStyles: Record<string, string> = {
    brand: "bg-brand-50/60 border-brand-200",
    amber: "bg-amber-50/60 border-amber-200",
  };
  const iconTone: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`card p-4 ${tone ? toneStyles[tone] : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
          tone ? iconTone[tone] : "bg-zinc-100 text-zinc-600"
        }`}
      >
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p
        className={`text-lg md:text-xl font-bold mt-0.5 tabular-nums ${
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
