import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import QuickCheckButtons from "./quick-check-buttons";

const DEPT_LABEL: Record<string, string> = {
  admin: "แอดมิน",
  graphic: "กราฟฟิก",
  print: "พิมพ์",
  roll: "รีดโรล",
  laser: "เลเซอร์",
  sew: "เย็บ",
  qc: "QC",
};

export const metadata = { title: "ลงเวลาเข้างาน — TG Sport ERP" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp?.date ?? new Date().toISOString().slice(0, 10);

  const employees = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.active, true))
    .orderBy(asc(schema.employees.dept), asc(schema.employees.name));

  const todayLogs = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.date, date));
  const logByEmp = new Map(todayLogs.map((l) => [l.employeeId, l]));

  const user = await getCurrentUser();
  const canRecord = !!user && can(user.role, "hr:attendance");

  const grouped = employees.reduce((acc, e) => {
    (acc[e.dept] ??= []).push(e);
    return acc;
  }, {} as Record<string, typeof employees>);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Clock size={24} /> ลงเวลาเข้างาน
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            บันทึกเข้า/ออกงานประจำวัน
          </p>
        </div>
        <form action="/attendance" method="get" className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">วันที่:</label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="input text-sm"
            style={{ width: 160 }}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            ดู
          </button>
        </form>
      </header>

      {employees.length === 0 ? (
        <div className="card p-12 text-center text-sm text-zinc-500">
          ยังไม่มีพนักงาน — <Link href="/employees/new" className="text-brand-600 hover:underline">เพิ่มคนแรก</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dept, emps]) => (
            <section key={dept} className="card overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-100 px-5 py-2.5">
                <h2 className="font-semibold text-ink-900 text-sm">
                  {DEPT_LABEL[dept] ?? dept}{" "}
                  <span className="text-zinc-500 text-xs font-normal">
                    · {emps.length} คน
                  </span>
                </h2>
              </div>
              <ul className="divide-y divide-zinc-100">
                {emps.map((e) => {
                  const log = logByEmp.get(e.id);
                  return (
                    <li
                      key={e.id}
                      className="px-5 py-3 flex items-center gap-3 flex-wrap"
                    >
                      <Link
                        href={`/employees/${e.id}`}
                        className="flex-1 min-w-32 font-medium text-ink-900 hover:text-brand-600 text-sm"
                      >
                        {e.name}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-zinc-600 tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1.5 ${log?.checkIn ? "" : "text-zinc-300"}`}
                        >
                          {log?.checkInPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a
                              href={log.checkInPhoto}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={log.checkInPhoto}
                                alt="เข้างาน"
                                className="w-7 h-7 rounded object-cover border border-zinc-200"
                              />
                            </a>
                          ) : null}
                          เข้า: {log?.checkIn ?? "—"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 ${log?.checkOut ? "" : "text-zinc-300"}`}
                        >
                          {log?.checkOutPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a
                              href={log.checkOutPhoto}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={log.checkOutPhoto}
                                alt="ออกงาน"
                                className="w-7 h-7 rounded object-cover border border-zinc-200"
                              />
                            </a>
                          ) : null}
                          ออก: {log?.checkOut ?? "—"}
                        </span>
                        {log?.otHours ? (
                          <span className="text-amber-700">
                            OT: {log.otHours} ชม.
                          </span>
                        ) : null}
                      </div>
                      {canRecord && (
                        <QuickCheckButtons
                          employeeId={e.id}
                          hasCheckIn={!!log?.checkIn}
                          hasCheckOut={!!log?.checkOut}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
