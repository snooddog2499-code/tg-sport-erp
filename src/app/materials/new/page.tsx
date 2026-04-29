import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import MaterialForm from "./form";

export const metadata = { title: "เพิ่มวัตถุดิบ — TG Sport ERP" };

export default async function NewMaterialPage() {
  await requirePerm("material:manage");
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link
        href="/materials"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← วัตถุดิบทั้งหมด
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        เพิ่มวัตถุดิบ
      </h1>
      <div className="card p-5 md:p-6">
        <MaterialForm />
      </div>
    </div>
  );
}
