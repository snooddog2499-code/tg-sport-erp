import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import EditForm from "./form";

export const metadata = { title: "แก้ไขตัวแทน — TG Sport ERP" };

export default async function EditDealerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePerm("dealer:manage");
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [dealer] = await db
    .select()
    .from(schema.dealers)
    .where(eq(schema.dealers.id, id));
  if (!dealer) notFound();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link
        href={`/dealers/${id}`}
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← กลับ
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        แก้ไขตัวแทน
      </h1>
      <div className="card p-5 md:p-6">
        <EditForm
          id={id}
          defaults={{
            name: dealer.name,
            phone: dealer.phone ?? "",
            lineId: dealer.lineId ?? "",
            email: dealer.email ?? "",
            address: dealer.address ?? "",
            commissionPct: dealer.commissionPct,
            discountPct: dealer.discountPct,
            note: dealer.note ?? "",
          }}
        />
      </div>
    </div>
  );
}
