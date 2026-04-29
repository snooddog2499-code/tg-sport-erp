import Link from "next/link";
import NewUserForm from "./form";

export const metadata = { title: "เพิ่มผู้ใช้งาน — ตั้งค่า" };

export default function NewUserPage() {
  return (
    <div className="max-w-2xl">
      <Link
        href="/settings/users"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← กลับ
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        เพิ่มผู้ใช้งาน
      </h1>
      <div className="card p-5 md:p-6">
        <NewUserForm />
      </div>
    </div>
  );
}
