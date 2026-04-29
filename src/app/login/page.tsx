import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./form";

export const metadata = {
  title: "เข้าสู่ระบบ — TG Sport ERP",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-600/30 mb-3">
            T
          </div>
          <h1 className="text-xl font-bold text-ink-900">TG Sport ERP</h1>
          <p className="text-xs text-zinc-500 tracking-wider uppercase mt-0.5">
            กาฬสินธุ์
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-900 mb-1">
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm text-zinc-500 mb-5">กรอกอีเมลและรหัสผ่านของคุณ</p>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-zinc-500 mt-5">
          ลืมรหัสผ่าน?{" "}
          <Link href="/" className="text-brand-600 hover:underline">
            ติดต่อผู้ดูแลระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
