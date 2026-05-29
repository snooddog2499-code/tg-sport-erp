import { db, schema } from "@/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBaht } from "@/lib/format";
import TransactionForm from "./transaction-form";
import DeleteButton from "./delete-button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
} from "lucide-react";
import { TXN_TYPE_LABELS, type TxnType } from "@/lib/finance-types";

export const metadata = { title: "รายรับ-รายจ่าย — TG Sport ERP" };

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

const THAI_SHORT_MONTHS = [
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

function parseYm(s: string | undefined): { year: number; month: number } {
  const now = new Date();
  if (!s) return { year: now.getFullYear(), month: now.getMonth() };
  const m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return { year: now.getFullYear(), month: now.getMonth() };
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year, month };
}

function ymString(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function ymdString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  promptpay: "พร้อมเพย์",
  credit_card: "บัตรเครดิต",
  other: "อื่นๆ",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ ym?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "finance:view")) redirect("/forbidden");

  const canManage = can(user.role, "finance:manage");

  const sp = await searchParams;
  const { year, month } = parseYm(sp?.ym);
  const view = sp?.view === "income" || sp?.view === "expense" ? sp.view : "all";

  const thaiYear = year + 543;
  const monthLabel = `${THAI_MONTHS[month]} ${thaiYear}`;
  const monthStartYmd = ymdString(year, month, 1);
  const nextMonthStartYmd = ymdString(
    month === 11 ? year + 1 : year,
    month === 11 ? 0 : month + 1,
    1
  );
  // For payments table (timestamptz) we need ISO datetime
  const monthStartIso = new Date(year, month, 1).toISOString();
  const nextMonthStartIso = new Date(
    month === 11 ? year + 1 : year,
    month === 11 ? 0 : month + 1,
    1
  ).toISOString();

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

  // Fetch manual transactions for the month
  const txns = await db
    .select({
      id: schema.transactions.id,
      entryDate: schema.transactions.entryDate,
      type: schema.transactions.type,
      category: schema.transactions.category,
      description: schema.transactions.description,
      amount: schema.transactions.amount,
      note: schema.transactions.note,
      createdAt: schema.transactions.createdAt,
      userName: schema.users.name,
    })
    .from(schema.transactions)
    .leftJoin(
      schema.users,
      eq(schema.transactions.recordedBy, schema.users.id)
    )
    .where(
      and(
        gte(schema.transactions.entryDate, monthStartYmd),
        lt(schema.transactions.entryDate, nextMonthStartYmd)
      )
    )
    .orderBy(desc(schema.transactions.entryDate));

  // Fetch payments (order income) for the month
  const payRows = await db
    .select({
      id: schema.payments.id,
      method: schema.payments.method,
      amount: schema.payments.amount,
      receivedAt: schema.payments.receivedAt,
      note: schema.payments.note,
      invoiceNo: schema.invoices.invoiceNo,
      orderId: schema.invoices.orderId,
      orderCode: schema.orders.code,
      customerName: schema.customers.name,
    })
    .from(schema.payments)
    .leftJoin(
      schema.invoices,
      eq(schema.payments.invoiceId, schema.invoices.id)
    )
    .leftJoin(
      schema.orders,
      eq(schema.invoices.orderId, schema.orders.id)
    )
    .leftJoin(
      schema.customers,
      eq(schema.orders.customerId, schema.customers.id)
    )
    .where(
      and(
        gte(schema.payments.receivedAt, monthStartIso),
        lt(schema.payments.receivedAt, nextMonthStartIso)
      )
    )
    .orderBy(desc(schema.payments.receivedAt));

  // Unify into a single timeline entry shape
  type UnifiedEntry = {
    key: string; // unique key for react
    date: string; // YYYY-MM-DD
    type: TxnType;
    category: string;
    description: string;
    amount: number;
    note: string | null;
    by: string | null;
    isOrderPayment: boolean;
    orderId?: number | null;
    orderCode?: string | null;
    txnId?: number; // present only for manual transactions
  };

  const unified: UnifiedEntry[] = [];
  for (const t of txns) {
    unified.push({
      key: `t-${t.id}`,
      date: t.entryDate,
      type: t.type as TxnType,
      category: t.category,
      description: t.description,
      amount: t.amount,
      note: t.note,
      by: t.userName,
      isOrderPayment: false,
      txnId: t.id,
    });
  }
  for (const p of payRows) {
    const d = new Date(p.receivedAt);
    const dateStr = ymdString(d.getFullYear(), d.getMonth(), d.getDate());
    unified.push({
      key: `p-${p.id}`,
      date: dateStr,
      type: "income",
      category: `รับชำระจากออเดอร์ (${PAYMENT_METHOD_LABELS[p.method] ?? p.method})`,
      description: `${p.customerName ?? "-"} · ${p.invoiceNo ?? "-"}`,
      amount: p.amount,
      note: p.note,
      by: null,
      isOrderPayment: true,
      orderId: p.orderId,
      orderCode: p.orderCode,
    });
  }

  // Apply view filter
  const filtered = unified.filter((e) => {
    if (view === "income") return e.type === "income";
    if (view === "expense") return e.type === "expense";
    return true;
  });

  // Sort by date desc, then push newest within same date last
  filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Group by date
  const byDate = new Map<string, UnifiedEntry[]>();
  for (const e of filtered) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  const sortedDateKeys = [...byDate.keys()].sort().reverse();

  // Compute totals from ALL entries (not filtered) so the stats stay
  // honest regardless of which tab the user is on
  const totalIncome = unified
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = unified
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;

  // Category breakdown for the current view (only used when one type is selected)
  const categoryTotals = new Map<string, number>();
  for (const e of unified) {
    if (view === "income" && e.type !== "income") continue;
    if (view === "expense" && e.type !== "expense") continue;
    if (view === "all") continue;
    categoryTotals.set(
      e.category,
      (categoryTotals.get(e.category) ?? 0) + e.amount
    );
  }
  const categoryRows = [...categoryTotals.entries()].sort(
    (a, b) => b[1] - a[1]
  );
  const categoryMax = Math.max(0, ...categoryRows.map(([, v]) => v));

  function viewHref(target: "all" | "income" | "expense"): string {
    return `/finance?ym=${thisYm}${target === "all" ? "" : `&view=${target}`}`;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Wallet size={24} strokeWidth={2} className="text-brand-600" />
            รายรับ-รายจ่าย
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            ดูภาพรวมเงินเข้า-ออกในแต่ละเดือน — รวมรับชำระจากออเดอร์โดยอัตโนมัติ
          </p>
        </div>
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/finance?ym=${prevYm}${view === "all" ? "" : `&view=${view}`}`}
            className="btn btn-ghost btn-sm"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </Link>
          <div className="px-4 py-1.5 text-sm font-semibold text-ink-900 min-w-[180px] text-center bg-white border border-zinc-200 rounded-md">
            {monthLabel}
          </div>
          <Link
            href={`/finance?ym=${nextYm}${view === "all" ? "" : `&view=${view}`}`}
            className="btn btn-ghost btn-sm"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </Link>
          {!isCurrentMonth && (
            <Link href="/finance" className="btn btn-outline btn-sm ml-1">
              เดือนปัจจุบัน
            </Link>
          )}
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="card p-4 md:p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60">
            <TrendingUp size={22} strokeWidth={2} />
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            รายรับ
          </p>
          <p className="text-xl md:text-2xl font-bold text-ink-900 mt-1 tabular-nums tracking-tight">
            {formatBaht(totalIncome)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {unified.filter((e) => e.type === "income").length} รายการ
          </p>
        </div>
        <div className="card p-4 md:p-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 ring-1 ring-rose-200/60">
            <TrendingDown size={22} strokeWidth={2} />
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            รายจ่าย
          </p>
          <p className="text-xl md:text-2xl font-bold text-ink-900 mt-1 tabular-nums tracking-tight">
            {formatBaht(totalExpense)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {unified.filter((e) => e.type === "expense").length} รายการ
          </p>
        </div>
        <div className="card p-4 md:p-5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-sm ring-1 ${
              net >= 0
                ? "bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-brand-200/60"
                : "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-amber-200/60"
            }`}
          >
            <Receipt size={22} strokeWidth={2} />
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
            กำไรสุทธิ
          </p>
          <p
            className={`text-xl md:text-2xl font-bold mt-1 tabular-nums tracking-tight ${
              net >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {net >= 0 ? "+" : "-"}
            {formatBaht(Math.abs(net))}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            รายรับ − รายจ่าย
          </p>
        </div>
      </section>

      {/* Add transaction form */}
      {canManage && (
        <section className="card p-4 md:p-5 mb-6">
          <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Plus size={15} className="text-brand-600" />
            เพิ่มรายการ
          </h2>
          <TransactionForm />
        </section>
      )}

      {/* View tabs */}
      <section className="card p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div
          role="tablist"
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/50 p-0.5"
        >
          {(["all", "income", "expense"] as const).map((v) => {
            const active = view === v;
            const label =
              v === "all"
                ? "ทั้งหมด"
                : v === "income"
                  ? TXN_TYPE_LABELS.income
                  : TXN_TYPE_LABELS.expense;
            return (
              <Link
                key={v}
                href={viewHref(v)}
                role="tab"
                aria-selected={active}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  active
                    ? "bg-white text-ink-900 shadow-sm border border-zinc-200"
                    : "text-zinc-600 hover:text-ink-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 ml-auto">
          {filtered.length} รายการ
        </p>
      </section>

      {/* Category breakdown (only when filtered by single type) */}
      {view !== "all" && categoryRows.length > 0 && (
        <section className="card p-4 md:p-5 mb-6">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">
            แยกตามหมวด — {TXN_TYPE_LABELS[view as TxnType]}
          </h2>
          <ul className="space-y-2">
            {categoryRows.map(([cat, total]) => {
              const pct = (total / categoryMax) * 100;
              return (
                <li key={cat}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-zinc-700">{cat}</span>
                    <span className="font-semibold tabular-nums text-ink-900">
                      {formatBaht(total)}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        view === "income" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Per-day breakdown */}
      <section>
        {sortedDateKeys.length === 0 ? (
          <div className="card p-12 text-center">
            <Wallet size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">
              ไม่มีรายการในเดือน{monthLabel}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDateKeys.map((key) => {
              const items = byDate.get(key) ?? [];
              const date = new Date(key + "T00:00:00");
              const dayIncome = items
                .filter((i) => i.type === "income")
                .reduce((s, i) => s + i.amount, 0);
              const dayExpense = items
                .filter((i) => i.type === "expense")
                .reduce((s, i) => s + i.amount, 0);
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
                          {date.getDate()} {THAI_SHORT_MONTHS[date.getMonth()]}{" "}
                          {thaiYear}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {items.length} รายการ
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      {dayIncome > 0 && (
                        <p className="text-emerald-700 tabular-nums">
                          + {formatBaht(dayIncome)}
                        </p>
                      )}
                      {dayExpense > 0 && (
                        <p className="text-rose-700 tabular-nums">
                          − {formatBaht(dayExpense)}
                        </p>
                      )}
                    </div>
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {items.map((e) => {
                      const TypeIcon =
                        e.type === "income" ? ArrowUpCircle : ArrowDownCircle;
                      const typeTone =
                        e.type === "income"
                          ? "text-emerald-600"
                          : "text-rose-600";
                      return (
                        <li
                          key={e.key}
                          className="px-4 md:px-5 py-3 hover:bg-zinc-50/50 text-sm flex items-center gap-3"
                        >
                          <TypeIcon
                            size={18}
                            strokeWidth={2}
                            className={`${typeTone} flex-shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {e.description}
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              <span className="inline-flex items-center text-[10px] font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded mr-1.5">
                                {e.category}
                              </span>
                              {e.isOrderPayment && e.orderCode && (
                                <Link
                                  href={`/orders/${e.orderId}`}
                                  className="text-brand-600 hover:underline mr-1.5"
                                >
                                  {e.orderCode}
                                </Link>
                              )}
                              {e.by && <span>โดย {e.by}</span>}
                              {e.note && (
                                <>
                                  <span className="mx-1">·</span>
                                  <span>{e.note}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                              e.type === "income"
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {e.type === "income" ? "+" : "−"}
                            {formatBaht(e.amount)}
                          </span>
                          {canManage && e.txnId && (
                            <DeleteButton id={e.txnId} />
                          )}
                          {e.isOrderPayment && (
                            <span
                              className="text-[9px] text-zinc-400"
                              title="รับชำระจากระบบออเดอร์ — แก้ไขที่หน้าออเดอร์"
                            >
                              auto
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
