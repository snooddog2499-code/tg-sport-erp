import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { formatBaht } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Users, UserPlus } from "lucide-react";

export const metadata = { title: "พนักงาน — TG Sport ERP" };

const DEPT_LABEL: Record<string, string> = {
  admin: "แอดมิน",
  graphic: "กราฟฟิก",
  print: "พิมพ์",
  roll: "รีดโรล",
  laser: "เลเซอร์",
  sew: "เย็บ",
  qc: "QC",
};

const SALARY_TYPE_LABEL: Record<string, string> = {
  monthly: "รายเดือน",
  daily: "รายวัน",
  piece: "รายชิ้น",
};

export default async function EmployeesPage() {
  const employees = await db
    .select()
    .from(schema.employees)
    .orderBy(asc(schema.employees.dept), asc(schema.employees.name));

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "hr:manage");

  const active = employees.filter((e) => e.active);
  const totalSalary = active
    .filter((e) => e.salaryType === "monthly")
    .reduce((s, e) => s + e.salary, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            พนักงาน
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {active.length} คนทำงานอยู่ · เงินเดือนรวม (รายเดือน) {formatBaht(totalSalary)}
          </p>
        </div>
        {canManage && (
          <Link href="/employees/new" className="btn btn-brand btn-sm">
            <UserPlus size={14} strokeWidth={2.5} />
            เพิ่มพนักงาน
          </Link>
        )}
      </header>

      <section className="card overflow-hidden">
        {employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500 mb-3">ยังไม่มีพนักงาน</p>
            {canManage && (
              <Link href="/employees/new" className="btn btn-brand btn-sm">
                <UserPlus size={13} />
                เพิ่มคนแรก
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">ชื่อ</th>
                  <th className="text-left px-3 py-2.5 font-medium">แผนก</th>
                  <th className="text-left px-3 py-2.5 font-medium">ประเภท</th>
                  <th className="text-right px-3 py-2.5 font-medium">อัตรา</th>
                  <th className="text-center px-3 py-2.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/employees/${e.id}`}
                        className="font-medium text-ink-900 hover:text-brand-600"
                      >
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-zinc-600">
                      {DEPT_LABEL[e.dept] ?? e.dept}
                    </td>
                    <td className="px-3 py-3 text-zinc-600 text-xs">
                      {SALARY_TYPE_LABEL[e.salaryType] ?? e.salaryType}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatBaht(e.salary)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`badge-plain ${
                          e.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {e.active ? "ทำงาน" : "พ้นสภาพ"}
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
