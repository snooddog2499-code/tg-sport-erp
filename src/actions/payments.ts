"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const PaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("ใส่ยอดมากกว่า 0"),
  method: z.enum(["cash", "transfer", "promptpay", "credit_card", "other"]),
  note: z.string().optional(),
});

export type PaymentFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function recordPayment(
  _prev: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  await requirePerm("payment:record");
  const parsed = PaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { orderId, amount, method, note } = parsed.data;
  const userId = await getCurrentUserId();

  let invoiceId: number;
  const existing = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.orderId, orderId))
    .limit(1);

  if (existing.length > 0) {
    invoiceId = existing[0].id;
  } else {
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));
    const invoiceNo = `INV-${order.code}`;
    const [inv] = await db
      .insert(schema.invoices)
      .values({
        orderId,
        invoiceNo,
        amount: order.total ?? 0,
      })
      .returning();
    invoiceId = inv.id;
  }

  const [payment] = await db
    .insert(schema.payments)
    .values({
      invoiceId,
      method,
      amount,
      note: note || null,
    })
    .returning();

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));

  const newPaid = (order.paid ?? 0) + amount;
  const newDeposit =
    order.deposit > 0 ? order.deposit : Math.min(newPaid, order.total ?? 0);

  await db
    .update(schema.orders)
    .set({
      paid: newPaid,
      deposit: newDeposit,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.orders.id, orderId));

  await logAction({
    userId,
    action: "payment_recorded",
    entity: "payment",
    entityId: payment.id,
    details: { orderId, amount, method },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
  return { message: "บันทึกการจ่ายเงินแล้ว" };
}
