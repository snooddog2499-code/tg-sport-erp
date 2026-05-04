"use server";

import { db, schema } from "@/db";
import { nextOrderCode } from "@/lib/order-code";
import { productionStageEnum } from "@/db/schema";
import { canTransition, type OrderStatus } from "@/lib/order-state";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { ORDER_FILE_ACCEPT } from "@/lib/uploads";
import { computeOrderTotals, bigSizeQtyFromBreakdown, BIG_SIZE_SURCHARGE } from "@/lib/order-totals";
import { getCurrentUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const OrderCreateSchema = z.object({
  customerId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  customerName: z.string().min(1, "กรุณาระบุชื่อลูกค้า").transform((s) => s.trim()),
  customerPhone: z.string().optional().transform((s) => s?.trim() || undefined),
  customerEmail: z
    .union([z.literal(""), z.string().email("อีเมลไม่ถูกต้อง")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  customerAddress: z.string().optional().transform((s) => s?.trim() || undefined),
  garmentType: z.string().min(1, "เลือกประเภทเสื้อ"),
  collar: z.string().optional(),
  qty: z.coerce.number().int().min(5, "ขั้นต่ำ 5 ตัว"),
  unitPrice: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(1).default(0),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  sizeBreakdownJson: z.string().optional(),
  dealerId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  assignedGraphicId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  requiresDeposit: z
    .union([z.literal("on"), z.literal("off"), z.literal("")])
    .optional()
    .transform((v) => v !== "off"),
});

const OrderUpdateSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  dealerId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  assignedGraphicId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : undefined)),
  discount: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(1).default(0),
});

export type OrderFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  await requirePerm("order:create");
  const parsed = OrderCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { customerName, garmentType, collar, qty, unitPrice, deadline, notes } =
    parsed.data;

  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;

  let customerId = parsed.data.customerId;
  if (!customerId) {
    const trimmed = customerName.trim();
    const [existing] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.name, trimmed))
      .limit(1);
    if (existing) {
      customerId = existing.id;
    } else {
      const [created] = await db
        .insert(schema.customers)
        .values({
          name: trimmed,
          tier: "new",
          phone: parsed.data.customerPhone ?? null,
          email: parsed.data.customerEmail ?? null,
          address: parsed.data.customerAddress ?? null,
        })
        .returning({ id: schema.customers.id });
      customerId = created.id;
      await logAction({
        userId,
        action: "create",
        entity: "customer",
        entityId: customerId,
        details: {
          name: trimmed,
          phone: parsed.data.customerPhone ?? null,
          email: parsed.data.customerEmail ?? null,
          address: parsed.data.customerAddress ?? null,
          via: "order_form",
        },
      });
    }
  }

  let dealerId: number | null = parsed.data.dealerId ?? null;
  if (currentUser?.role === "dealer" && currentUser.dealerId) {
    dealerId = currentUser.dealerId;
  }

  let dealerInfo: { discountPct: number; commissionPct: number } | null = null;
  if (dealerId) {
    const [dealer] = await db
      .select()
      .from(schema.dealers)
      .where(eq(schema.dealers.id, dealerId));
    if (dealer && dealer.active) {
      dealerInfo = {
        discountPct: dealer.discountPct ?? 0,
        commissionPct: dealer.commissionPct ?? 0,
      };
    } else {
      dealerId = null;
    }
  }

  // Pre-compute sizeBreakdown JSON for surcharge calc (also used below for items)
  let preliminarySizeBreakdown: string | null = null;
  if (parsed.data.sizeBreakdownJson) {
    try {
      const obj = JSON.parse(parsed.data.sizeBreakdownJson) as Record<
        string,
        number
      >;
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj)) {
        const n = Math.max(0, Math.floor(Number(v) || 0));
        if (n > 0) cleaned[k] = n;
      }
      if (Object.keys(cleaned).length > 0) {
        preliminarySizeBreakdown = JSON.stringify(cleaned);
      }
    } catch {
      // ignore
    }
  }

  const subtotal = qty * unitPrice;
  const sizeSurcharge =
    bigSizeQtyFromBreakdown(preliminarySizeBreakdown) * BIG_SIZE_SURCHARGE;

  const totals = computeOrderTotals({
    subtotal,
    sizeSurcharge,
    dealerDiscountPct: dealerInfo?.discountPct,
    dealerCommissionPct: dealerInfo?.commissionPct,
    discount: parsed.data.discount,
    shipping: parsed.data.shipping,
    vatRate: parsed.data.vatRate,
  });

  const code = await nextOrderCode();

  const [order] = await db
    .insert(schema.orders)
    .values({
      code,
      customerId,
      status: "received",
      deadline: deadline || null,
      notes: notes || null,
      total: totals.total,
      deposit:
        (parsed.data.requiresDeposit ?? true)
          ? Math.round(totals.total * 0.5 * 100) / 100
          : 0,
      dealerId,
      dealerDiscount: totals.dealerDiscount,
      dealerCommission: totals.dealerCommission,
      discount: totals.discount,
      shipping: totals.shipping,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      sizeSurcharge: totals.sizeSurcharge,
      requiresDeposit: parsed.data.requiresDeposit ?? true,
      assignedGraphicId: parsed.data.assignedGraphicId ?? null,
      createdBy: userId ?? null,
    })
    .returning();

  const sizeBreakdown = preliminarySizeBreakdown;

  await db.insert(schema.orderItems).values({
    orderId: order.id,
    garmentType,
    collar: collar?.trim() || null,
    qty,
    unitPrice,
    sizeBreakdown,
  });

  // Auto-create production stages so the graphic team sees the new order
  // immediately on the production board (no need to wait for "in_production")
  const nowIso = new Date().toISOString();
  await db.insert(schema.productionStages).values(
    productionStageEnum.map((stage, i) => ({
      orderId: order.id,
      stage,
      status: i === 0 ? ("active" as const) : ("pending" as const),
      startedAt: i === 0 ? nowIso : null,
      assignedTo:
        stage === "graphic" && parsed.data.assignedGraphicId
          ? parsed.data.assignedGraphicId
          : null,
    }))
  );

  // Files were already uploaded directly to Supabase Storage from the
  // browser via signed URLs (see AttachmentUploader). The form sends us
  // the resulting public URLs + metadata as parallel hidden inputs.
  const urls = formData.getAll("attachmentUrls").map(String).filter(Boolean);
  const names = formData.getAll("attachmentNames").map(String);
  const mimes = formData.getAll("attachmentMimes").map(String);
  const sizes = formData
    .getAll("attachmentSizes")
    .map((v) => Number(v) || 0);

  for (let i = 0; i < urls.length; i++) {
    const mime = mimes[i] ?? "";
    if (mime && !ORDER_FILE_ACCEPT.includes(mime)) continue;
    await db.insert(schema.orderFiles).values({
      orderId: order.id,
      fileUrl: urls[i],
      fileName: names[i] ?? "file",
      mimeType: mime || "application/octet-stream",
      sizeBytes: sizes[i] ?? 0,
      uploadedBy: userId ?? null,
    });
  }

  await logAction({
    userId,
    action: "create",
    entity: "order",
    entityId: order.id,
    details: {
      code,
      customerId,
      qty,
      dealerId,
      attachments: urls.length,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/production");
  revalidatePath("/");
  if (dealerId) revalidatePath(`/dealers/${dealerId}`);
  redirect(`/orders/${order.id}`);
}

export async function updateOrderMeta(
  id: number,
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  await requirePerm("order:edit");
  const parsed = OrderUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();

  await db
    .update(schema.orders)
    .set({
      customerId: parsed.data.customerId,
      deadline: parsed.data.deadline || null,
      notes: parsed.data.notes || null,
      assignedGraphicId: parsed.data.assignedGraphicId ?? null,
      discount: parsed.data.discount,
      shipping: parsed.data.shipping,
      vatRate: parsed.data.vatRate,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.orders.id, id));

  // Recalculate total with new discount/shipping/vat
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, id));
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
    .where(eq(schema.orders.id, id));
  let dealerInfo: { discountPct: number; commissionPct: number } | null = null;
  if (order?.dealerId) {
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
    discount: parsed.data.discount,
    shipping: parsed.data.shipping,
    vatRate: parsed.data.vatRate,
  });
  await db
    .update(schema.orders)
    .set({
      total: totals.total,
      dealerDiscount: totals.dealerDiscount,
      dealerCommission: totals.dealerCommission,
      vatAmount: totals.vatAmount,
      sizeSurcharge: totals.sizeSurcharge,
    })
    .where(eq(schema.orders.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "order",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  redirect(`/orders/${id}`);
}

export async function updateOrderStatus(id: number, status: string) {
  await requirePerm("order:status");
  const validStatus = z
    .enum([
      "received",
      "quoted",
      "approved",
      "in_production",
      "qc",
      "ready",
      "delivered",
      "paid",
      "cancelled",
    ])
    .parse(status) as OrderStatus;

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id));

  if (!order) throw new Error("Order not found");

  if (!canTransition(order.status as OrderStatus, validStatus)) {
    throw new Error(
      `ไม่อนุญาตเปลี่ยนสถานะจาก "${order.status}" → "${validStatus}"`
    );
  }

  const userId = await getCurrentUserId();

  await db
    .update(schema.orders)
    .set({ status: validStatus, updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, id));

  await logAction({
    userId,
    action: "status_change",
    entity: "order",
    entityId: id,
    details: { from: order.status, to: validStatus },
  });

  if (validStatus === "in_production") {
    const existing = await db
      .select()
      .from(schema.productionStages)
      .where(eq(schema.productionStages.orderId, id));

    if (existing.length === 0) {
      await db.insert(schema.productionStages).values(
        productionStageEnum.map((stage, i) => ({
          orderId: id,
          stage,
          status: i === 0 ? ("active" as const) : ("pending" as const),
          startedAt: i === 0 ? new Date().toISOString() : null,
          assignedTo:
            stage === "graphic" && order.assignedGraphicId
              ? order.assignedGraphicId
              : null,
        }))
      );
    } else if (order.assignedGraphicId) {
      await db
        .update(schema.productionStages)
        .set({ assignedTo: order.assignedGraphicId })
        .where(
          and(
            eq(schema.productionStages.orderId, id),
            eq(schema.productionStages.stage, "graphic")
          )
        );
    }
  }

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/production");
  revalidatePath("/");
}

export async function deleteOrder(id: number) {
  await requirePerm("order:delete");
  const userId = await getCurrentUserId();

  await db.delete(schema.orders).where(eq(schema.orders.id, id));

  await logAction({
    userId,
    action: "delete",
    entity: "order",
    entityId: id,
  });

  revalidatePath("/orders");
  revalidatePath("/production");
  revalidatePath("/");
  redirect("/orders");
}
