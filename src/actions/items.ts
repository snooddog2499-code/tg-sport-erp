"use server";

import { db, schema } from "@/db";
import { eq, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import {
  computeOrderTotals,
  bigSizeQtyFromBreakdown,
  BIG_SIZE_SURCHARGE,
} from "@/lib/order-totals";

const ItemSchema = z.object({
  garmentType: z.string().min(1, "เลือกประเภท"),
  collar: z.string().optional(),
  qty: z.coerce.number().int().min(1, "จำนวนต้อง ≥ 1"),
  unitPrice: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
  sizeBreakdownJson: z.string().optional(),
});

export type ItemFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

async function recalcOrderTotal(orderId: number) {
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const subtotal = items.reduce(
    (s, it) => s + it.qty * (it.unitPrice ?? 0),
    0
  );
  const sizeSurcharge = items.reduce(
    (s, it) =>
      s + bigSizeQtyFromBreakdown(it.sizeBreakdown) * BIG_SIZE_SURCHARGE,
    0
  );

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) return;

  let dealerInfo: { discountPct: number; commissionPct: number } | null = null;
  if (order.dealerId) {
    const [dealer] = await db
      .select()
      .from(schema.dealers)
      .where(eq(schema.dealers.id, order.dealerId));
    if (dealer) {
      dealerInfo = {
        discountPct: dealer.discountPct ?? 0,
        commissionPct: dealer.commissionPct ?? 0,
      };
    }
  }

  const totals = computeOrderTotals({
    subtotal,
    sizeSurcharge,
    dealerDiscountPct: dealerInfo?.discountPct,
    dealerCommissionPct: dealerInfo?.commissionPct,
    discount: order.discount ?? 0,
    shipping: order.shipping ?? 0,
    vatRate: order.vatRate ?? 0,
  });

  // Keep deposit in sync with total when no payment received yet
  // (only if requiresDeposit and paid hasn't reached the deposit yet)
  const existingPaid = order?.paid ?? 0;
  const desiredDeposit = order?.requiresDeposit
    ? Math.round(totals.total * 0.5 * 100) / 100
    : 0;
  const newDeposit =
    existingPaid === 0 || existingPaid < desiredDeposit
      ? desiredDeposit
      : (order?.deposit ?? 0);

  await db
    .update(schema.orders)
    .set({
      total: totals.total,
      deposit: newDeposit,
      dealerDiscount: totals.dealerDiscount,
      dealerCommission: totals.dealerCommission,
      vatAmount: totals.vatAmount,
      sizeSurcharge: totals.sizeSurcharge,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.orders.id, orderId));
}

function packSizes(d: z.infer<typeof ItemSchema>): string | null {
  if (!d.sizeBreakdownJson) return null;
  try {
    const obj = JSON.parse(d.sizeBreakdownJson) as Record<string, number>;
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n > 0) cleaned[k] = n;
    }
    return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
  } catch {
    return null;
  }
}

export async function addItem(
  orderId: number,
  _prev: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  await requirePerm("item:manage");
  const parsed = ItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const sizeBreakdown = packSizes(parsed.data);
  const userId = await getCurrentUserId();

  const [inserted] = await db
    .insert(schema.orderItems)
    .values({
      orderId,
      garmentType: parsed.data.garmentType,
      collar: parsed.data.collar?.trim() || null,
      qty: parsed.data.qty,
      unitPrice: parsed.data.unitPrice,
      note: parsed.data.note,
      sizeBreakdown,
    })
    .returning();

  await recalcOrderTotal(orderId);

  await logAction({
    userId,
    action: "create",
    entity: "order_item",
    entityId: inserted.id,
    details: { orderId, qty: parsed.data.qty },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { message: "เพิ่มรายการแล้ว" };
}

export async function deleteItem(itemId: number, orderId: number) {
  await requirePerm("item:manage");
  const userId = await getCurrentUserId();
  await db.delete(schema.orderItems).where(eq(schema.orderItems.id, itemId));
  await recalcOrderTotal(orderId);
  await logAction({
    userId,
    action: "delete",
    entity: "order_item",
    entityId: itemId,
    details: { orderId },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
