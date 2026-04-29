import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import EmployeeForm from "./form";

export const metadata = { title: "เพิ่มพนักงาน — TG Sport ERP" };

export default async function NewEmployeePage() {
  await requirePerm("hr:manage");
  const users = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .orderBy(asc(schema.users.name));

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link
        href="/employees"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← พนักงานทั้งหมด
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        เพิ่มพนักงาน
      </h1>
      <div className="card p-5 md:p-6">
        <EmployeeForm users={users} />
      </div>
    </div>
  );
}
