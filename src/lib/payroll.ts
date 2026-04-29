import { db, schema } from "@/db";
import { and, eq, gte, lte } from "drizzle-orm";

const OT_RATE = 1.5;
const WORK_DAYS_PER_MONTH = 26;

export type PayrollResult = {
  employeeId: number;
  month: string;
  workedDays: number;
  otHours: number;
  basePay: number;
  otPay: number;
  total: number;
  breakdown: Array<{
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    otHours: number;
    worked: boolean;
  }>;
};

function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function calculatePayroll(
  employeeId: number,
  monthYm: string
): Promise<PayrollResult> {
  const { start, end } = monthRange(monthYm);
  const [emp] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, employeeId));
  if (!emp) throw new Error("employee not found");

  const rows = await db
    .select()
    .from(schema.attendance)
    .where(
      and(
        eq(schema.attendance.employeeId, employeeId),
        gte(schema.attendance.date, start),
        lte(schema.attendance.date, end)
      )
    )
    .orderBy(schema.attendance.date);

  const workedDays = rows.filter(
    (r) => r.checkIn && r.checkOut
  ).length;
  const otHours = rows.reduce((s, r) => s + (r.otHours ?? 0), 0);

  let basePay = 0;
  let otPay = 0;

  if (emp.salaryType === "monthly") {
    const daysInMonth = new Date(
      ...(monthYm.split("-").map(Number) as [number, number]),
      0
    ).getDate();
    const perDay = emp.salary / WORK_DAYS_PER_MONTH;
    const perHour = perDay / 8;
    basePay = emp.salary * (workedDays / WORK_DAYS_PER_MONTH);
    if (workedDays >= WORK_DAYS_PER_MONTH) basePay = emp.salary;
    otPay = otHours * perHour * OT_RATE;
    void daysInMonth;
  } else if (emp.salaryType === "daily") {
    const perHour = emp.salary / 8;
    basePay = workedDays * emp.salary;
    otPay = otHours * perHour * OT_RATE;
  } else {
    basePay = 0;
    otPay = 0;
  }

  return {
    employeeId,
    month: monthYm,
    workedDays,
    otHours,
    basePay: Math.round(basePay),
    otPay: Math.round(otPay),
    total: Math.round(basePay + otPay),
    breakdown: rows.map((r) => ({
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      otHours: r.otHours ?? 0,
      worked: !!(r.checkIn && r.checkOut),
    })),
  };
}
