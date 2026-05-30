import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import TransactionForm from "./transaction-form";
import { Wallet, FileText, Plus } from "lucide-react";

export const metadata = { title: "รายรับ-รายจ่าย — TG Sport ERP" };

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "finance:view")) redirect("/forbidden");

  const canManage = can(user.role, "finance:manage");

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <Wallet size={24} strokeWidth={2} className="text-brand-600" />
            รายรับ-รายจ่าย
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            เพิ่มรายการรายรับ/รายจ่าย — ภาพรวมและสรุปยอดดูได้ที่{" "}
            <Link href="/" className="text-brand-600 hover:underline">
              แดชบอร์ด
            </Link>
          </p>
        </div>
        {canManage && (
          <Link href="/finance/new" className="btn btn-brand btn-sm">
            <FileText size={14} strokeWidth={2.5} />
            สร้างเอกสาร
          </Link>
        )}
      </header>

      {canManage ? (
        <section className="card p-4 md:p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Plus size={15} className="text-brand-600" />
            เพิ่มรายการเร็ว
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            สำหรับบันทึกรายการเล็ก ๆ ที่ไม่ต้องมีรายละเอียดผู้จำหน่าย
            หรือใบกำกับภาษี — ถ้าต้องการเอกสารครบให้กด{" "}
            <span className="font-medium">สร้างเอกสาร</span> ด้านบน
          </p>
          <TransactionForm />
        </section>
      ) : (
        <section className="card p-8 text-center">
          <p className="text-sm text-zinc-500">
            คุณมีสิทธิ์ดูภาพรวมเท่านั้น — ดูสรุปได้ที่{" "}
            <Link href="/" className="text-brand-600 hover:underline">
              แดชบอร์ด
            </Link>
          </p>
        </section>
      )}

    </div>
  );
}
