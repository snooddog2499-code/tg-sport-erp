"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requirePerm, can } from "@/lib/permissions";
import { requireAuth } from "@/lib/auth";
import { DEPT_VALUES } from "@/lib/withdrawal-types";

const WithdrawSchema = z.object({
  materialId: z.coerce.number().int().positive("กรุณาเลือกวัตถุดิบ"),
  qty: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  dept: z.enum(DEPT_VALUES, { message: "กรุณาเลือกแผนก" }),
  orderId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
  note: z.string().optional(),
});

export type WithdrawFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function withdrawMaterial(
  _prev: WithdrawFormState,
  formData: FormData
): Promise<WithdrawFormState> {
  const user = await requirePerm("material:use");

  const parsed = WithdrawSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { materialId, qty, dept, orderId, note } = parsed.data;

  // Look up material + check stock
  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (!material) {
    return { message: "ไม่พบวัตถุดิบ" };
  }

  const currentStock = material.stock ?? 0;
  if (qty > currentStock) {
    return {
      errors: {
        qty: [
          `สต็อกไม่พอ — คงเหลือ ${currentStock} ${material.unit}, ต้องเบิก ${qty}`,
        ],
      },
    };
  }

  const newStock = currentStock - qty;

  // Atomic: deduct stock + insert withdrawal record
  await db.transaction(async (tx) => {
    await tx
      .update(schema.materials)
      .set({ stock: newStock, updatedAt: new Date().toISOString() })
      .where(eq(schema.materials.id, materialId));

    await tx.insert(schema.materialWithdrawals).values({
      materialId,
      qty,
      dept,
      withdrawnBy: user.id,
      orderId: orderId ?? null,
      note: note || null,
    });

    // If linked to an order, also record in material_usage for cost tracking
    if (orderId) {
      await tx.insert(schema.materialUsage).values({
        orderId,
        materialId,
        qtyUsed: qty,
      });
    }
  });

  await logAction({
    userId: user.id,
    action: "material_withdraw",
    entity: "material",
    entityId: materialId,
    details: {
      qty,
      dept,
      orderId: orderId ?? null,
      from: currentStock,
      to: newStock,
      note: note ?? null,
    },
  });

  revalidatePath("/withdrawals");
  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/");

  return {
    success: true,
    message: `เบิก ${qty} ${material.unit} สำเร็จ — คงเหลือ ${newStock}`,
  };
}

const DeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function deleteWithdrawal(
  _prev: WithdrawFormState,
  formData: FormData
): Promise<WithdrawFormState> {
  const user = await requireAuth();
  // Q3=C — only owner/admin/manager can delete (returns stock)
  if (!can(user.role, "material:manage")) {
    return { message: "ไม่มีสิทธิ์ลบรายการเบิก" };
  }

  const parsed = DeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { id } = parsed.data;
  const [w] = await db
    .select()
    .from(schema.materialWithdrawals)
    .where(eq(schema.materialWithdrawals.id, id));
  if (!w) return { message: "ไม่พบรายการเบิก" };

  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, w.materialId));
  if (!material) return { message: "ไม่พบวัตถุดิบ" };

  const restored = (material.stock ?? 0) + w.qty;

  await db.transaction(async (tx) => {
    // Restore stock
    await tx
      .update(schema.materials)
      .set({ stock: restored, updatedAt: new Date().toISOString() })
      .where(eq(schema.materials.id, w.materialId));

    // Delete the withdrawal
    await tx
      .delete(schema.materialWithdrawals)
      .where(eq(schema.materialWithdrawals.id, id));
  });

  await logAction({
    userId: user.id,
    action: "withdrawal_delete",
    entity: "material",
    entityId: w.materialId,
    details: {
      withdrawalId: id,
      restoredQty: w.qty,
      stockAfter: restored,
    },
  });

  revalidatePath("/withdrawals");
  revalidatePath("/materials");
  revalidatePath(`/materials/${w.materialId}`);

  return { success: true, message: `ลบรายการเบิกแล้ว — คืนสต็อก ${w.qty}` };
}
