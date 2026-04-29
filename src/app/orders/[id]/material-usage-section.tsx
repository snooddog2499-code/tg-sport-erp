import { db, schema } from "@/db";
import { asc, eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatDateTH } from "@/lib/format";
import { Boxes, Trash2 } from "lucide-react";
import { deleteMaterialUsage } from "@/actions/material-usage";
import ConfirmButton from "./confirm-button";
import UsageForm from "./material-usage-form";

export default async function MaterialUsageSection({
  orderId,
  canUse,
}: {
  orderId: number;
  canUse: boolean;
}) {
  const [materials, usages] = await Promise.all([
    db.select().from(schema.materials).orderBy(asc(schema.materials.name)),
    db
      .select({
        id: schema.materialUsage.id,
        qtyUsed: schema.materialUsage.qtyUsed,
        recordedAt: schema.materialUsage.recordedAt,
        materialId: schema.materialUsage.materialId,
        materialName: schema.materials.name,
        unit: schema.materials.unit,
      })
      .from(schema.materialUsage)
      .leftJoin(
        schema.materials,
        eq(schema.materialUsage.materialId, schema.materials.id)
      )
      .where(eq(schema.materialUsage.orderId, orderId))
      .orderBy(desc(schema.materialUsage.recordedAt)),
  ]);

  if (materials.length === 0 && usages.length === 0) return null;

  return (
    <section className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Boxes size={16} className="text-zinc-500" />
        <div>
          <h2 className="font-semibold text-ink-900 text-sm">การใช้วัตถุดิบ</h2>
          <p className="text-xs text-zinc-500">
            {usages.length} รายการ — ตัดสต็อกอัตโนมัติเมื่อบันทึก
          </p>
        </div>
      </div>

      {usages.length > 0 && (
        <ul className="divide-y divide-zinc-100">
          {usages.map((u) => (
            <li
              key={u.id}
              className="px-5 py-3 flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/materials/${u.materialId}`}
                  className="font-medium text-ink-900 hover:text-brand-600"
                >
                  {u.materialName}
                </Link>
                <p className="text-xs text-zinc-500">
                  {formatDateTH(u.recordedAt)}
                </p>
              </div>
              <span className="tabular-nums font-semibold text-ink-900">
                {u.qtyUsed} {u.unit}
              </span>
              {canUse && (
                <form
                  action={async () => {
                    "use server";
                    await deleteMaterialUsage(u.id, orderId);
                  }}
                >
                  <ConfirmButton
                    message="ลบรายการใช้วัตถุดิบนี้? สต็อกจะถูกคืน"
                    className="btn btn-ghost btn-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUse && materials.length > 0 && (
        <div className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100">
          <UsageForm
            orderId={orderId}
            materials={materials.map((m) => ({
              id: m.id,
              name: m.name,
              unit: m.unit,
              stock: m.stock ?? 0,
            }))}
          />
        </div>
      )}
    </section>
  );
}
