import { db, schema } from "@/db";
import { and, eq, gte, lte, lt, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { formatBaht, formatDateTH, stageLabels } from "@/lib/format";
import type { ProductionStage } from "@/db/schema";
import {
  Calendar,
  ClipboardList,
  Wallet,
  Truck,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Palette,
  Printer,
  Flame,
  Scissors,
  Shirt,
  ShieldCheck,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

const stageTone: Record<ProductionStage, string> = {
  graphic: "bg-pink-50 text-pink-700",
  print: "bg-sky-50 text-sky-700",
  roll: "bg-orange-50 text-orange-700",
  laser: "bg-indigo-50 text-indigo-700",
  sew: "bg-teal-50 text-teal-700",
  qc: "bg-emerald-50 text-emerald-700",
  pack: "bg-amber-50 text-amber-700",
  ship: "bg-zinc-100 text-zinc-700",
};

type RangeKey = "today" | "week" | "30d" | "day";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "วันนี้",
  week: "สัปดาห์นี้",
  "30d": "30 วันที่ผ่านมา",
  day: "เลือกวัน",
};

function parseDateParam(s: string | undefined): Date {
  if (!s) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return d;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDateParam(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatLocalYmd(d);
}

// Compute [start, end) range. End is exclusive.
function computeRange(
  range: RangeKey,
  selectedDate: Date
): { start: Date; end: Date; label: string; isFuture: boolean } {
  const now = new Date();
  const todayLocal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const tomorrow = new Date(todayLocal);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (range === "today") {
    return {
      start: todayLocal,
      end: tomorrow,
      label: todayLocal.toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      isFuture: false,
    };
  }

  if (range === "week") {
    // Monday-based week (Thai/ISO convention)
    const dow = todayLocal.getDay(); // 0=Sun..6=Sat
    const daysSinceMon = (dow + 6) % 7; // Mon=0..Sun=6
    const weekStart = new Date(todayLocal);
    weekStart.setDate(weekStart.getDate() - daysSinceMon);
    return {
      start: weekStart,
      end: tomorrow,
      label: `${weekStart.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      })} – ${todayLocal.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
      isFuture: false,
    };
  }

  if (range === "30d") {
    const start = new Date(todayLocal);
    start.setDate(start.getDate() - 29); // include today = 30 days
    return {
      start,
      end: tomorrow,
      label: `${start.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      })} – ${todayLocal.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
      isFuture: false,
    };
  }

  // range === "day" — single chosen date
  const dayStart = new Date(selectedDate);
  const dayEnd = new Date(selectedDate);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return {
    start: dayStart,
    end: dayEnd,
    label: selectedDate.toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    isFuture: selectedDate.getTime() > todayLocal.getTime(),
  };
}

function parseRange(s: string | undefined): RangeKey {
  if (s === "week" || s === "30d" || s === "day") return s;
  return "today";
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; range?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role === "dealer") redirect("/dealer-portal");

  const sp = await searchParams;
  const range = parseRange(sp?.range);
  const selectedDate = parseDateParam(sp?.date);
  const ymd = formatLocalYmd(selectedDate);

  const { start, end, label, isFuture } = computeRange(range, selectedDate);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // For UI: how many days are in the current range (used for label adjustments)
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / dayMs)
  );
  const isMultiDay = rangeDays > 1;

  const [
    ordersOfRange,
    paymentsOfRange,
    stagesDoneOfRange,
    deliveredOfRange,
    orderCreatedRows,
  ] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        totalSum: sql<number>`coalesce(sum(${schema.orders.total}), 0)`.mapWith(
          Number
        ),
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, startIso),
          lt(schema.orders.createdAt, endIso)
        )
      ),
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        totalSum: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`.mapWith(
          Number
        ),
      })
      .from(schema.payments)
      .where(
        and(
          gte(schema.payments.receivedAt, startIso),
          lt(schema.payments.receivedAt, endIso)
        )
      ),
    db
      .select({
        stage: schema.productionStages.stage,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.productionStages)
      .where(
        and(
          eq(schema.productionStages.status, "done"),
          gte(schema.productionStages.completedAt, startIso),
          lt(schema.productionStages.completedAt, endIso)
        )
      )
      .groupBy(schema.productionStages.stage),
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.status, "delivered"),
          gte(schema.orders.updatedAt, startIso),
          lt(schema.orders.updatedAt, endIso)
        )
      ),
    db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        total: schema.orders.total,
        deposit: schema.orders.deposit,
        customerName: schema.customers.name,
        createdByName: schema.users.name,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id)
      )
      .leftJoin(schema.users, eq(schema.orders.createdBy, schema.users.id))
      .where(
        and(
          gte(schema.orders.createdAt, startIso),
          lt(schema.orders.createdAt, endIso)
        )
      )
      .orderBy(desc(schema.orders.createdAt))
      .limit(20),
  ]);

  const orderCount = ordersOfRange[0]?.count ?? 0;
  const orderTotal = Number(ordersOfRange[0]?.totalSum ?? 0);
  const paymentCount = paymentsOfRange[0]?.count ?? 0;
  const paymentTotal = Number(paymentsOfRange[0]?.totalSum ?? 0);
  const deliveredCount = deliveredOfRange[0]?.count ?? 0;
  const totalStagesDone = stagesDoneOfRange.reduce((s, r) => s + r.count, 0);

  const stageDoneMap = new Map<string, number>(
    stagesDoneOfRange.map((s) => [s.stage, s.count])
  );

  const STAGES: ProductionStage[] = [
    "graphic",
    "print",
    "roll",
    "laser",
    "sew",
    "qc",
    "pack",
    "ship",
  ];

  // Helper: build URL preserving range/date
  function rangeHref(target: RangeKey): string {
    if (target === "day") return `/?range=day&date=${ymd}`;
    return `/?range=${target}`;
  }

  const rangeButtons: { key: RangeKey; label: string }[] = [
    { key: "today", label: "วันนี้" },
    { key: "week", label: "สัปดาห์นี้" },
    { key: "30d", label: "30 วัน" },
    { key: "day", label: "เลือกวัน" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
          แดชบอร์ด
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          ภาพรวมงาน — TG Sport · กาฬสินธุ์
        </p>
      </header>

      {/* Range selector */}
      <section className="card p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-zinc-500 flex-shrink-0" />
          <div
            role="tablist"
            className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/50 p-0.5"
          >
            {rangeButtons.map((b) => {
              const active = range === b.key;
              return (
                <Link
                  key={b.key}
                  href={rangeHref(b.key)}
                  role="tab"
                  aria-selected={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? "bg-white text-ink-900 shadow-sm border border-zinc-200"
                      : "text-zinc-600 hover:text-ink-900"
                  }`}
                >
                  {b.label}
                </Link>
              );
            })}
          </div>

          {range === "day" && (
            <div className="flex items-center gap-1 flex-wrap">
              <Link
                href={`/?range=day&date=${shiftDateParam(selectedDate, -1)}`}
                className="btn btn-ghost btn-xs"
                aria-label="วันก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </Link>
              <form
                method="get"
                action="/"
                className="inline-flex items-center gap-1"
              >
                <input type="hidden" name="range" value="day" />
                <input
                  type="date"
                  name="date"
                  defaultValue={ymd}
                  className="input text-sm"
                  style={{ width: 160 }}
                />
                <button type="submit" className="btn btn-outline btn-xs">
                  ดู
                </button>
              </form>
              <Link
                href={`/?range=day&date=${shiftDateParam(selectedDate, 1)}`}
                className="btn btn-ghost btn-xs"
                aria-label="วันถัดไป"
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          <p className="text-sm font-medium text-ink-900 ml-auto">
            {label}
            {range === "day" && isFuture && (
              <span className="text-xs text-zinc-400 ml-1.5">
                (วันในอนาคต)
              </span>
            )}
          </p>
        </div>
        {isMultiDay && (
          <p className="text-[11px] text-zinc-500 mt-2 ml-6">
            ครอบคลุม {rangeDays} วัน · ตัวเลขทุกอย่างสรุปทั้งช่วง
          </p>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          icon={ClipboardList}
          tone="brand"
          label="ออเดอร์ใหม่"
          primary={`${orderCount} ใบ`}
          secondary={orderTotal > 0 ? formatBaht(orderTotal) : null}
        />
        <StatCard
          icon={Wallet}
          tone="emerald"
          label="ยอดรับเงิน"
          primary={formatBaht(paymentTotal)}
          secondary={paymentCount > 0 ? `${paymentCount} รายการ` : null}
        />
        <StatCard
          icon={CheckCircle2}
          tone="purple"
          label="งานเสร็จในแต่ละสเตจ"
          primary={`${totalStagesDone} ครั้ง`}
          secondary={
            stagesDoneOfRange.length > 0
              ? `${stagesDoneOfRange.length} แผนก`
              : null
          }
        />
        <StatCard
          icon={Truck}
          tone="amber"
          label="ส่งมอบ"
          primary={`${deliveredCount} ใบ`}
        />
      </section>

      {/* Stage activity */}
      <section className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-ink-900 text-sm flex items-center gap-2">
            <TrendingUp size={15} className="text-zinc-500" />
            งานเสร็จต่อแผนก{isMultiDay ? "ในช่วงนี้" : "ในวันนี้"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            แต่ละแผนกปิดงานไปกี่ครั้ง — {label}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-zinc-100 border-t border-zinc-100">
          {STAGES.map((stage) => {
            const count = stageDoneMap.get(stage) ?? 0;
            const Icon = stageIcon[stage];
            return (
              <div key={stage} className="px-3 py-3">
                <div
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-md mb-1.5 ${stageTone[stage]}`}
                >
                  <Icon size={13} strokeWidth={2.25} />
                </div>
                <p className="text-[11px] text-zinc-500">
                  {stageLabels[stage]}
                </p>
                <p
                  className={`text-xl font-bold tabular-nums ${
                    count === 0 ? "text-zinc-300" : "text-ink-900"
                  }`}
                >
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Orders of the range */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-900 text-sm">
              ออเดอร์ที่รับเข้ามา{isMultiDay ? "ในช่วงนี้" : "ในวันนี้"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {orderCount} ใบ · ยอดรวม {formatBaht(orderTotal)}
              {orderCount > 20 && (
                <span className="ml-1">(แสดง 20 ล่าสุด)</span>
              )}
            </p>
          </div>
          <Link
            href="/orders"
            className="text-xs text-zinc-600 hover:text-ink-900 flex items-center gap-1 group"
          >
            ดูทั้งหมด
            <ArrowRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        {orderCreatedRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            ไม่มีออเดอร์ที่รับ{isMultiDay ? "ในช่วงนี้" : "ในวันนี้"}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {orderCreatedRows.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-500 w-24 flex-shrink-0">
                    {o.code}
                  </span>
                  <span className="flex-1 truncate text-ink-900">
                    {o.customerName}
                  </span>
                  {isMultiDay && (
                    <span className="text-[11px] text-zinc-400 hidden md:inline whitespace-nowrap">
                      {formatDateTH(o.createdAt)}
                    </span>
                  )}
                  {o.createdByName && (
                    <span className="text-[11px] text-zinc-500 hidden lg:inline">
                      โดย {o.createdByName}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500 hidden sm:inline">
                    {(o.deposit ?? 0) > 0
                      ? `มัดจำ ${formatBaht(o.deposit)}`
                      : "ไม่มัดจำ"}
                  </span>
                  <span className="tabular-nums font-semibold text-ink-900 w-24 text-right flex-shrink-0">
                    {formatBaht(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stage completions detail */}
      {stagesDoneOfRange.length > 0 && (
        <section className="card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-ink-900 text-sm">
              รายละเอียดงานที่ปิด — {RANGE_LABELS[range]}
            </h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {stagesDoneOfRange.map((s) => {
              const Icon = stageIcon[s.stage];
              return (
                <li
                  key={s.stage}
                  className="px-5 py-3 flex items-center gap-3 text-sm"
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${stageTone[s.stage]}`}
                  >
                    <Icon size={13} strokeWidth={2.25} />
                  </div>
                  <span className="flex-1 text-ink-900">
                    {stageLabels[s.stage]}
                  </span>
                  <span className="font-semibold text-ink-900 tabular-nums">
                    {s.count} งาน
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  primary,
  secondary,
}: {
  icon: LucideIcon;
  tone: "brand" | "emerald" | "purple" | "amber";
  label: string;
  primary: string;
  secondary?: string | null;
}) {
  const toneStyles: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="card p-4 md:p-5">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${toneStyles[tone]}`}
      >
        <Icon size={18} strokeWidth={2.25} />
      </div>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-ink-900 mt-1 tabular-nums">
        {primary}
      </p>
      {secondary && (
        <p className="text-[11px] text-zinc-500 mt-0.5">{secondary}</p>
      )}
    </div>
  );
}

// Avoid unused import errors
void lte;
