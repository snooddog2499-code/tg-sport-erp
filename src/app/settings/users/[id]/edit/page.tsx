import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditUserForm from "./form";

export const metadata = { title: "แก้ไขผู้ใช้งาน — ตั้งค่า" };

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [u] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  if (!u) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/settings/users"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← กลับ
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-1">
        แก้ไขผู้ใช้งาน
      </h1>
      <p className="text-sm text-zinc-500 mb-6 font-mono">{u.email}</p>
      <div className="card p-5 md:p-6">
        <EditUserForm
          id={id}
          defaults={{
            name: u.name,
            role: u.role,
            dept: u.dept ?? "",
          }}
        />
      </div>
    </div>
  );
}
