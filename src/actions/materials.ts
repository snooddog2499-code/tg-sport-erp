"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const MaterialSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อวัตถุดิบ"),
  unit: z.string().min(1, "กรุณากรอกหน่วย"),
  stock: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0),
  costPerUnit: z.coerce.number().min(0).default(0),
  supplier: z.string().optional(),
});

export type MaterialFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createMaterial(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requirePerm("material:manage");
  const parsed = MaterialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();
  const [inserted] = await db
    .insert(schema.materials)
    .values({
      ...parsed.data,
      supplier: parsed.data.supplier || null,
    })
    .returning();

  await logAction({
    userId,
    action: "create",
    entity: "material",
    entityId: inserted.id,
    details: { name: parsed.data.name, unit: parsed.data.unit },
  });

  revalidatePath("/materials");
  redirect(`/materials/${inserted.id}`);
}

export async function updateMaterial(
  id: number,
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requirePerm("material:manage");
  const parsed = MaterialSchema.omit({ stock: true }).safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();

  await db
    .update(schema.materials)
    .set({
      name: parsed.data.name,
      unit: parsed.data.unit,
      reorderPoint: parsed.data.reorderPoint,
      costPerUnit: parsed.data.costPerUnit,
      supplier: parsed.data.supplier || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.materials.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "material",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath(`/materials/${id}`);
  revalidatePath("/materials");
  redirect(`/materials/${id}`);
}

export async function deleteMaterial(id: number) {
  await requirePerm("material:manage");
  const userId = await getCurrentUserId();

  await db.delete(schema.materials).where(eq(schema.materials.id, id));

  await logAction({
    userId,
    action: "delete",
    entity: "material",
    entityId: id,
  });

  revalidatePath("/materials");
  redirect("/materials");
}

const RestockSchema = z.object({
  materialId: z.coerce.number().int().positive(),
  qty: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  note: z.string().optional(),
});

export async function restockMaterial(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requirePerm("material:manage");
  const parsed = RestockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { materialId, qty, note } = parsed.data;
  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (!material) return { message: "ไม่พบวัตถุดิบ" };

  const userId = await getCurrentUserId();
  const newStock = (material.stock ?? 0) + qty;

  await db
    .update(schema.materials)
    .set({ stock: newStock, updatedAt: new Date().toISOString() })
    .where(eq(schema.materials.id, materialId));

  await logAction({
    userId,
    action: "restock",
    entity: "material",
    entityId: materialId,
    details: { qty, from: material.stock, to: newStock, note },
  });

  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  revalidatePath("/");
  return { message: `เพิ่มสต็อก ${qty} ${material.unit}` };
}

const AdjustSchema = z.object({
  materialId: z.coerce.number().int().positive(),
  newStock: z.coerce.number().min(0),
  reason: z.string().min(1, "กรุณากรอกเหตุผล"),
});

export async function adjustStock(
  _prev: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  await requirePerm("material:manage");
  const parsed = AdjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { materialId, newStock, reason } = parsed.data;
  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (!material) return { message: "ไม่พบวัตถุดิบ" };

  const userId = await getCurrentUserId();

  await db
    .update(schema.materials)
    .set({ stock: newStock, updatedAt: new Date().toISOString() })
    .where(eq(schema.materials.id, materialId));

  await logAction({
    userId,
    action: "stock_adjust",
    entity: "material",
    entityId: materialId,
    details: { from: material.stock, to: newStock, reason },
  });

  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  revalidatePath("/");
  return { message: "ปรับสต็อกแล้ว" };
}
