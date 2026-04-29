import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatBaht, formatDateTH } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { calculatePayroll } from "@/lib/payroll";
import { Pencil, UserCheck, UserX } from "lucide-react";
import { toggleEmployeeActive } from "@/actions/employees";
import AttendanceForm from "./attendance-form";

const DEPT_LABEL: Record<string, string> = {
  admin: "แอดมิน",
  graphic: "กราฟฟิก",
  print: "พิมพ์",
  roll: "รีดโรล",
  laser: "เลเซอร์",
  sew: "เย็บ",
  qc: "QC",
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [emp] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  if (!emp) notFound();

  const sp = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = sp?.month ?? currentMonth;

  const payroll = await calculatePayroll(id, month);

  const recentAttendance = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.employeeId, id))
    .orderBy(desc(schema.attendance.date))
    .limit(10);

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "hr:manage");
  const canAttendance = !!user && can(user.role, "hr:attendance");

  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/employees"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← พนักงานทั้งหมด
      </Link>

      <header className="mt-2 mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            {emp.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {DEPT_LABEL[emp.dept] ?? emp.dept} ·{" "}
            {emp.salaryType === "monthly"
              ? "รายเดือน"
              : emp.salaryType === "daily"
                ? "รายวัน"
                : "รายชิ้น"}{" "}
            · อัตรา {formatBaht(emp.salary)}
            {emp.startDate && ` · เริ่มงาน ${formatDateTH(emp.startDate)}`}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/employees/${id}/edit`}
              className="btn btn-outline btn-sm"
            >
              <Pencil size={12} />
              แก้ไข
            </Link>
            <form
              action={async () => {
                "use server";
                await toggleEmployeeActive(id);
              }}
            >
              <button
                type="submit"
                className={`btn btn-sm ${
                  emp.active ? "btn-outline" : "btn-brand"
                }`}
              >
                {emp.active ? (
                  <>
                    <UserX size={12} /> ให้พ้นสภาพ
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

      <section className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-ink-900 text-sm">
              สรุปเงินเดือน
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              คำนวณจากข้อมูลลงเวลา · อัตรา OT = 1.5x
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {months.map((m) => (
              <Link
                key={m}
                href={`?month=${m}`}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  m === month
                    ? "bg-ink-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {m}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PayrollStat label="วันทำงาน" value={`${payroll.workedDays} วัน`} />
          <PayrollStat label="ชั่วโมง OT" value={`${payroll.otHours} ชม.`} />
          <PayrollStat label="ค่าแรง" value={formatBaht(payroll.basePay)} />
          <PayrollStat
            label="รวมรับ"
            value={formatBaht(payroll.total)}
            highlight
          />
        </div>
      </section>

      {canAttendance && (
        <section className="card p-5 mb-6">
          <h2 className="font-semibold text-ink-900 text-sm mb-1">
            บันทึกเวลาย้อนหลัง / ปรับแก้
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            สำหรับเพิ่ม/แก้เวลาย้อนหลัง หรือบันทึก OT
          </p>
          <AttendanceForm employeeId={id} />
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-ink-900 text-sm">
            ประวัติการลงเวลา (10 ล่าสุด)
          </h2>
        </div>
        {recentAttendance.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            ยังไม่มีข้อมูล
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">วันที่</th>
                <th className="text-center px-3 py-2.5 font-medium">เข้า</th>
                <th className="text-center px-3 py-2.5 font-medium">ออก</th>
                <th className="text-right px-5 py-2.5 font-medium">OT (ชม.)</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-2.5 text-zinc-700">{a.date}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {a.checkIn ?? "-"}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {a.checkOut ?? "-"}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {a.otHours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function PayrollStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight
          ? "bg-brand-50 border border-brand-200"
          : "bg-zinc-50 border border-zinc-200"
      }`}
    >
      <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
      <p
        className={`text-lg md:text-xl font-bold tabular-nums ${
          highlight ? "text-brand-700" : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
