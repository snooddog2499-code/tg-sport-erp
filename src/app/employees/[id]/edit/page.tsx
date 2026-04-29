import { db, schema } from "@/db";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import EditForm from "./form";

export const metadata = { title: "แก้ไขพนักงาน — TG Sport ERP" };

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePerm("hr:manage");
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [emp] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  if (!emp) notFound();

  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link
        href={`/employees/${id}`}
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← กลับ
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        แก้ไขพนักงาน
      </h1>
      <div className="card p-5 md:p-6">
        <EditForm
          id={id}
          users={users}
          defaults={{
            name: emp.name,
            dept: emp.dept,
            salary: emp.salary,
            salaryType: emp.salaryType,
            startDate: emp.startDate ?? "",
            userId: emp.userId ?? 0,
          }}
        />
      </div>
    </div>
  );
}
