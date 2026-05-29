import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ArrowLeft, FileText } from "lucide-react";
import DocumentForm from "./document-form";

export const metadata = { title: "สร้างเอกสารการเงิน — TG Sport ERP" };

export default async function NewFinanceDocPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "finance:manage")) redirect("/forbidden");

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/finance"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink-900 mb-3"
      >
        <ArrowLeft size={14} />
        รายรับ-รายจ่าย
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
          <FileText size={24} strokeWidth={2} className="text-brand-600" />
          สร้างเอกสาร
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          กรอกรายละเอียดผู้จำหน่าย รายการ และยอดรวม — ระบบจะออกเลขเอกสารให้
          อัตโนมัติ
        </p>
      </header>

      <DocumentForm />
    </div>
  );
}
