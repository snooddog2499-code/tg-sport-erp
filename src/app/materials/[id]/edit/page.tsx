import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import EditForm from "./form";

export const metadata = { title: "แก้ไขวัตถุดิบ — TG Sport ERP" };

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePerm("material:manage");
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, id));
  if (!material) notFound();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link
        href={`/materials/${id}`}
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← กลับ
      </Link>
      <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 mt-2 mb-6">
        แก้ไขวัตถุดิบ
      </h1>
      <div className="card p-5 md:p-6">
        <EditForm
          id={id}
          defaultValues={{
            name: material.name,
            unit: material.unit,
            reorderPoint: material.reorderPoint,
            costPerUnit: material.costPerUnit,
            supplier: material.supplier ?? "",
          }}
        />
      </div>
    </div>
  );
}
