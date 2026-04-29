import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "ไม่มีสิทธิ์ — TG Sport ERP" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="max-w-sm w-full card p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={28} className="text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-ink-900 mb-1">
          ไม่มีสิทธิ์เข้าถึง
        </h1>
        <p className="text-sm text-zinc-500 mb-5">
          บัญชีของคุณไม่ได้รับอนุญาตให้ทำรายการนี้
          กรุณาติดต่อผู้จัดการหรือเจ้าของระบบ
        </p>
        <Link href="/" className="btn btn-primary btn-sm w-full">
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
