"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const UsageSchema = z.object({
  materialId: z.coerce.number().int().positive("เลือกวัตถุดิบ"),
  qtyUsed: z.coerce.number().positive("ใส่จำนวนมากกว่า 0"),
});

export type UsageFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function recordMaterialUsage(
  orderId: number,
  _prev: UsageFormState,
  formData: FormData
): Promise<UsageFormState> {
  await requirePerm("material:use");
  const parsed = UsageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { materialId, qtyUsed } = parsed.data;

  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (!material) return { message: "ไม่พบวัตถุดิบ" };

  const userId = await getCurrentUserId();
  const newStock = Math.max(0, (material.stock ?? 0) - qtyUsed);

  const [usage] = await db
    .insert(schema.materialUsage)
    .values({
      orderId,
      materialId,
      qtyUsed,
    })
    .returning();

  await db
    .update(schema.materials)
    .set({ stock: newStock, updatedAt: new Date().toISOString() })
    .where(eq(schema.materials.id, materialId));

  await logAction({
    userId,
    action: "material_used",
    entity: "material_usage",
    entityId: usage.id,
    details: {
      orderId,
      materialId,
      material: material.name,
      qtyUsed,
      stockAfter: newStock,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  revalidatePath("/");
  return {
    message: `บันทึกใช้ ${qtyUsed} ${material.unit} แล้ว (เหลือ ${newStock})`,
  };
}

export async function deleteMaterialUsage(
  usageId: number,
  orderId: number
) {
  await requirePerm("material:use");

  const [row] = await db
    .select()
    .from(schema.materialUsage)
    .where(eq(schema.materialUsage.id, usageId));
  if (!row) return;

  await db
    .delete(schema.materialUsage)
    .where(eq(schema.materialUsage.id, usageId));

  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, row.materialId));

  if (material) {
    const restored = (material.stock ?? 0) + row.qtyUsed;
    await db
      .update(schema.materials)
      .set({ stock: restored, updatedAt: new Date().toISOString() })
      .where(eq(schema.materials.id, row.materialId));
  }

  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "delete",
    entity: "material_usage",
    entityId: usageId,
    details: { orderId, materialId: row.materialId, qtyUsed: row.qtyUsed },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/materials/${row.materialId}`);
  revalidatePath("/materials");
}
