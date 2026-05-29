import { db, schema } from "@/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBaht } from "@/lib/format";
import { DEPT_LABELS, type WithdrawalDept } from "@/lib/withdrawal-types";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PackageMinus,
  TrendingDown,
  Building2,
  ArrowLeft,
} from "lucide-react";

export const metadata = {
  title: "ประวัติเบิกรายเดือน — TG Sport ERP",
};

export const dynamic = "force-dynamic";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function parseYm(s: string | undefined): { year: number; month: number } {
  // month is 0-indexed in returned value
  const now = new Date();
  if (!s) return { year: now.getFullYear(), month: now.getMonth() };
  const m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return { year: now.getFullYear(), month: now.getMonth() };
  const year = Number(m[1]);
  const month = Number(m[2]) - 1; // 1-12 → 0-11
  if (month < 0 || month > 11) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year, month };
}

function ymString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function thaiDateLabel(d: Date): string {
  // "27 พ.ค." style for compact rows
  const shortMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d.getDate()} ${shortMonths[d.getMonth()]}`;
}

export default async function MaterialWithdrawalsByMonthPage({
  searchParams,
}: {
  searchParams?: Promise<{ ym?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "material:use")) redirect("/forbidden");

  const sp = await searchParams;
  const { year, month } = parseYm(sp?.ym);
  const monthStart = new Date(year, month, 1);
  const nextMonthStart = new Date(year, month + 1, 1);
  const prevYm = ymString(
    month === 0 ? year - 1 : year,
    month === 0 ? 11 : month - 1
  );
  const nextYm = ymString(
    month === 11 ? year + 1 : year,
    month === 11 ? 0 : month + 1
  );
  const currentYm = (() => {
    const n = new Date();
    return ymString(n.getFullYear(), n.getMonth());
  })();
  const thisYm = ymString(year, month);
  const isCurrentMonth = thisYm === currentYm;
  // +543 to convert AD → Buddhist year (Thai convention)
  const thaiYear = year + 543;
  const monthLabel = `${THAI_MONTHS[month]} ${thaiYear}`;

  // Pull all withdrawals for the month with related data
  const rows = await db
    .select({
      id: schema.materialWithdrawals.id,
      qty: schema.materialWithdrawals.qty,
      dept: schema.materialWithdrawals.dept,
      note: schema.materialWithdrawals.note,
      withdrawnAt: schema.materialWithdrawals.withdrawnAt,
      orderId: schema.materialWithdrawals.orderId,
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
    .where(
      and(
        gte(
          schema.materialWithdrawals.withdrawnAt,
          monthStart.toISOString()
        ),
        lt(
          schema.materialWithdrawals.withdrawnAt,
          nextMonthStart.toISOString()
        )
      )
    )
    .orderBy(desc(schema.materialWithdrawals.withdrawnAt));

  // Group rows by local date (YYYY-MM-DD)
  type Row = (typeof rows)[number];
  const byDate = new Map<string, Row[]>();
  let totalCost = 0;
  for (const r of rows) {
    if (!r.withdrawnAt) continue;
    const d = new Date(r.withdrawnAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const arr = byDate.get(key) ?? [];
    arr.push(r);
    byDate.set(key, arr);
    totalCost += (r.qty ?? 0) * (r.costPerUnit ?? 0);
  }
  const sortedDateKeys = [...byDate.keys()].sort().reverse();

  // Top dept in this month
  const [topDept] = await db
    .select({
      dept: schema.materialWithdrawals.dept,
      total: sql<number>`sum(${schema.materialWithdrawals.qty})::float`,
      cnt: sql<number>`count(*)::int`,
    })
    .from(schema.materialWithdrawals)
    .where(
      and(
        gte(
          schema.materialWithdrawals.withdrawnAt,
          monthStart.toISOString()
        ),
        lt(
          schema.materialWithdrawals.withdrawnAt,
          nextMonthStart.toISOString()
        )
      )
    )
    .groupBy(schema.materialWithdrawals.dept)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  // Days-of-month grid (for the calendar heatmap)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Leading blanks: weekday of day 1 (Sun=0 .. Sat=6)
  const leading = new Date(year, month, 1).getDay();

  const countsByDay = new Map<number, number>();
  for (const [key, arr] of byDate) {
    const day = Number(key.split("-")[2]);
    countsByDay.set(day, arr.length);
  }
  const maxDayCount = Math.max(0, ...countsByDay.values());

  function heatTone(count: number): string {
    if (count === 0) return "bg-zinc-50 text-zinc-300";
    if (maxDayCount === 0) return "bg-zinc-50 text-zinc-300";
    const pct = count / maxDayCount;
    if (pct >= 0.8) return "bg-brand-600 text-white";
    if (pct >= 0.5) return "bg-brand-400 text-white";
    if (pct >= 0.25) return "bg-brand-200 text-brand-900";
    return "bg-brand-100 text-brand-800";
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/materials"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink-900 mb-3"
      >
        <ArrowLeft size={14} />
        วัตถุดิบ
      </Link>

      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <CalendarDays size={24} strokeWidth={2} className="text-brand-600" />
            ประวัติเบิกวัตถุดิบ
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            ดูรายละเอียดการเบิกวัตถุดิบของแต่ละวันในเดือน
          </p>
        </div>
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/materials/withdrawals?ym=${prevYm}`}
            className="btn btn-ghost btn-sm"
            aria-label="เดือนก่อนหน้า"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </Link>
          <div className="px-4 py-1.5 text-sm font-semibold text-ink-900 min-w-[180px] text-center bg-white border border-zinc-200 rounded-md">
            {monthLabel}
          </div>
          <Link
            href={`/materials/withdrawals?ym=${nextYm}`}
            className="btn btn-ghost btn-sm"
            aria-label="เดือนถัดไป"
            title="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/materials/withdrawals"
              className="btn btn-outline btn-sm ml-1"
            >
              เดือนปัจจุบัน
            </Link>
          )}
        </div>
      </header>

      {/* Summary stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <PackageMinus size={13} />
            เบิกเดือนนี้
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {rows.length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">รายการ</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <TrendingDown size={13} />
            มูลค่ารวม
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {formatBaht(totalCost)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            ประมาณการต้นทุน
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Building2 size={13} />
            แผนกเบิกบ่อยสุด
          </div>
          <p className="text-2xl font-bold text-ink-900">
            {topDept?.dept
              ? DEPT_LABELS[topDept.dept as WithdrawalDept] ?? topDept.dept
              : "-"}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {topDept?.cnt ? `${topDept.cnt} ครั้ง` : "—"}
          </p>
        </div>
      </section>

      {/* Calendar heatmap */}
      <section className="card p-4 md:p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">
          ภาพรวมเดือน
        </h2>
        <div className="grid grid-cols-7 gap-1.5 text-xs">
          {THAI_DOW.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-zinc-500 py-1"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: leading }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const count = countsByDay.get(day) ?? 0;
            const tone = heatTone(count);
            return (
              <div
                key={day}
                title={
                  count > 0
                    ? `${day} ${THAI_MONTHS[month].slice(0, 3)}: ${count} รายการ`
                    : `${day} ${THAI_MONTHS[month].slice(0, 3)}: ไม่มีการเบิก`
                }
                className={`aspect-square rounded-md flex flex-col items-center justify-center font-medium ${tone} transition-colors`}
              >
                <span className="text-[10px] leading-tight">{day}</span>
                {count > 0 && (
                  <span className="text-[10px] tabular-nums leading-tight">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-4 text-[10px] text-zinc-500">
          <span>น้อย</span>
          <div className="flex gap-1">
            <span className="w-4 h-4 rounded bg-zinc-50 border border-zinc-100" />
            <span className="w-4 h-4 rounded bg-brand-100" />
            <span className="w-4 h-4 rounded bg-brand-200" />
            <span className="w-4 h-4 rounded bg-brand-400" />
            <span className="w-4 h-4 rounded bg-brand-600" />
          </div>
          <span>มาก</span>
        </div>
      </section>

      {/* Per-day breakdown */}
      <section>
        {sortedDateKeys.length === 0 ? (
          <div className="card p-12 text-center">
            <PackageMinus
              size={40}
              className="mx-auto text-zinc-300 mb-3"
            />
            <p className="text-sm text-zinc-500">
              ไม่มีการเบิกวัตถุดิบในเดือน{monthLabel}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDateKeys.map((key) => {
              const items = byDate.get(key) ?? [];
              const date = new Date(key + "T00:00:00");
              const dayCost = items.reduce(
                (s, r) => s + (r.qty ?? 0) * (r.costPerUnit ?? 0),
                0
              );
              return (
                <div key={key} className="card overflow-hidden">
                  <div className="px-4 md:px-5 py-3 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 flex flex-col items-center justify-center">
                        <span className="text-[9px] text-zinc-500 leading-none">
                          {THAI_DOW[date.getDay()]}
                        </span>
                        <span className="text-base font-bold text-ink-900 leading-tight">
                          {date.getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {thaiDateLabel(date)} {thaiYear}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {items.length} รายการ
                          {dayCost > 0 && (
                            <span className="ml-1.5">
                              · มูลค่ารวม{" "}
                              <span className="font-semibold text-zinc-700">
                                {formatBaht(dayCost)}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {items.map((w) => {
                      const cost =
                        (w.qty ?? 0) * (w.costPerUnit ?? 0);
                      const time = new Date(w.withdrawnAt).toLocaleTimeString(
                        "th-TH",
                        { hour: "2-digit", minute: "2-digit" }
                      );
                      return (
                        <li
                          key={w.id}
                          className="px-4 md:px-5 py-3 hover:bg-zinc-50/50 text-sm flex items-center gap-3"
                        >
                          <span className="text-[10px] text-zinc-400 w-10 flex-shrink-0 tabular-nums">
                            {time}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {w.materialName ?? "?"}
                              <span className="ml-2 text-xs font-normal text-zinc-500">
                                {w.qty} {w.materialUnit}
                              </span>
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              <span className="inline-flex items-center text-[10px] font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded mr-1.5">
                                {DEPT_LABELS[w.dept as WithdrawalDept] ?? w.dept}
                              </span>
                              {w.userName && (
                                <span>โดย {w.userName}</span>
                              )}
                              {w.orderCode && (
                                <>
                                  <span className="mx-1">·</span>
                                  <Link
                                    href={`/orders/${w.orderId}`}
                                    className="text-brand-600 hover:underline"
                                  >
                                    {w.orderCode}
                                  </Link>
                                </>
                              )}
                              {w.note && (
                                <>
                                  <span className="mx-1">·</span>
                                  <span>{w.note}</span>
                                </>
                              )}
                            </p>
                          </div>
                          {cost > 0 && (
                            <span className="text-xs tabular-nums text-zinc-600 flex-shrink-0">
                              {formatBaht(cost)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
