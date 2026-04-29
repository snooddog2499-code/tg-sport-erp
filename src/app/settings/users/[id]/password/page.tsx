import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import ResetPasswordForm from "./form";

export const metadata = { title: "เปลี่ยนรหัสผ่าน — ตั้งค่า" };

export default async function PasswordPage({
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
        เปลี่ยนรหัสผ่าน
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        ของ <span className="font-medium text-ink-900">{u.name}</span> ·{" "}
        <span className="font-mono text-xs">{u.email}</span>
      </p>
      <div className="card p-5 md:p-6">
        <ResetPasswordForm id={id} />
      </div>
    </div>
  );
}
