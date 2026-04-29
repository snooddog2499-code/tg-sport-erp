"use server";

import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const PriceSchema = z.object({
  dealerId: z.coerce.number().int().positive(),
  garmentType: z.string().min(1, "เลือกประเภทเสื้อ"),
  price: z.coerce.number().min(0, "ราคาต้อง ≥ 0"),
  minQty: z.coerce.number().int().min(1).default(1),
  note: z.string().optional(),
});

export type DealerPriceFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function setDealerPrice(
  _prev: DealerPriceFormState,
  formData: FormData
): Promise<DealerPriceFormState> {
  await requirePerm("dealer:manage");
  const parsed = PriceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { dealerId, garmentType, price, minQty, note } = parsed.data;

  const [existing] = await db
    .select()
    .from(schema.dealerPrices)
    .where(
      and(
        eq(schema.dealerPrices.dealerId, dealerId),
        eq(schema.dealerPrices.garmentType, garmentType),
        eq(schema.dealerPrices.minQty, minQty)
      )
    )
    .limit(1);

  const userId = await getCurrentUserId();
  const nowIso = new Date().toISOString();

  if (existing) {
    await db
      .update(schema.dealerPrices)
      .set({ price, note: note ?? null, updatedAt: nowIso })
      .where(eq(schema.dealerPrices.id, existing.id));
    await logAction({
      userId,
      action: "update",
      entity: "dealer_price",
      entityId: existing.id,
      details: { dealerId, garmentType, price, minQty },
    });
  } else {
    const [inserted] = await db
      .insert(schema.dealerPrices)
      .values({ dealerId, garmentType, price, minQty, note: note ?? null })
      .returning();
    await logAction({
      userId,
      action: "create",
      entity: "dealer_price",
      entityId: inserted.id,
      details: { dealerId, garmentType, price, minQty },
    });
  }

  revalidatePath(`/dealers/${dealerId}`);
  return { message: "บันทึกราคาแล้ว" };
}

export async function deleteDealerPrice(id: number, dealerId: number) {
  await requirePerm("dealer:manage");
  await db
    .delete(schema.dealerPrices)
    .where(eq(schema.dealerPrices.id, id));
  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "delete",
    entity: "dealer_price",
    entityId: id,
    details: { dealerId },
  });
  revalidatePath(`/dealers/${dealerId}`);
}

export async function listDealerPrices(dealerId: number) {
  return db
    .select()
    .from(schema.dealerPrices)
    .where(eq(schema.dealerPrices.dealerId, dealerId))
    .orderBy(asc(schema.dealerPrices.garmentType), asc(schema.dealerPrices.minQty));
}
