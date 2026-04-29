import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import DealerForm from "./form";

export const metadata = { title: "เพิ่มตัวแทน — TG Sport ERP" };

export default async function NewDealerPage() {
  await requirePerm("dealer:manage");
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/dealers" className="text-xs text-zinc-500 hover:text-ink-900">
        ← ตัวแทนทั้งหมด
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        เพิ่มตัวแทน
      </h1>
      <div className="card p-5 md:p-6">
        <DealerForm />
      </div>
    </div>
  );
}
