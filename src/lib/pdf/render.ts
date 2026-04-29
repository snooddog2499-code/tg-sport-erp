import "server-only";
import { db, schema } from "@/db";
import { eq, desc, max } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFile } from "fs/promises";
import path from "path";
import { QuotationPDF, InvoicePDF, WorkOrderPDF } from "./documents";
import { isImageMime, inferMimeFromUrl } from "@/lib/uploads";
import type { ProductionStage } from "@/db/schema";

export async function renderQuotationPDF(orderId: number): Promise<Buffer> {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) throw new Error("order not found");

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, order.customerId));
  if (!customer) throw new Error("customer not found");

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));

  return renderToBuffer(
    QuotationPDF({
      order: {
        code: order.code,
        deadline: order.deadline,
        notes: order.notes,
        total: order.total,
        deposit: order.deposit,
        paid: order.paid,
        createdAt: order.createdAt,
        discount: order.discount,
        shipping: order.shipping,
        vatRate: order.vatRate,
        vatAmount: order.vatAmount,
        dealerDiscount: order.dealerDiscount,
        sizeSurcharge: order.sizeSurcharge,
        requiresDeposit: order.requiresDeposit,
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
      },
      items: items.map((it) => ({
        garmentType: it.garmentType,
        collar: it.collar,
        qty: it.qty,
        unitPrice: it.unitPrice ?? 0,
        sizeBreakdown: it.sizeBreakdown,
        note: it.note,
      })),
    })
  );
}

async function ensureInvoice(orderId: number, amount: number): Promise<string> {
  const existing = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.orderId, orderId))
    .orderBy(desc(schema.invoices.issuedAt))
    .limit(1);
  if (existing[0]) return existing[0].invoiceNo;

  const ym = new Date().toISOString().slice(2, 7).replace("-", "");
  const [row] = await db
    .select({ maxId: max(schema.invoices.id) })
    .from(schema.invoices);
  const seq = ((row?.maxId ?? 0) + 1).toString().padStart(4, "0");
  const invoiceNo = `INV-${ym}-${seq}`;

  await db.insert(schema.invoices).values({
    orderId,
    invoiceNo,
    amount,
  });
  return invoiceNo;
}

export async function renderInvoicePDF(orderId: number): Promise<Buffer> {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) throw new Error("order not found");

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, order.customerId));
  if (!customer) throw new Error("customer not found");

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));

  const invoiceNo = await ensureInvoice(orderId, order.total);

  return renderToBuffer(
    InvoicePDF({
      order: {
        code: order.code,
        deadline: order.deadline,
        notes: order.notes,
        total: order.total,
        deposit: order.deposit,
        paid: order.paid,
        createdAt: order.createdAt,
        discount: order.discount,
        shipping: order.shipping,
        vatRate: order.vatRate,
        vatAmount: order.vatAmount,
        dealerDiscount: order.dealerDiscount,
        sizeSurcharge: order.sizeSurcharge,
        requiresDeposit: order.requiresDeposit,
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
      },
      items: items.map((it) => ({
        garmentType: it.garmentType,
        collar: it.collar,
        qty: it.qty,
        unitPrice: it.unitPrice ?? 0,
        sizeBreakdown: it.sizeBreakdown,
        note: it.note,
      })),
      invoiceNo,
    })
  );
}

async function loadImageAsDataUri(publicUrl: string): Promise<string | null> {
  const mime = inferMimeFromUrl(publicUrl);
  if (!isImageMime(mime)) return null;
  try {
    if (publicUrl.startsWith("http")) {
      // Remote URL (Supabase Storage)
      const res = await fetch(publicUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${mime};base64,${buf.toString("base64")}`;
    }
    // Legacy local path (kept for safety during migration)
    const abs = path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
    const buf = await readFile(abs);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderWorkOrderPDF(orderId: number): Promise<Buffer> {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId));
  if (!order) throw new Error("order not found");

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, order.customerId));
  if (!customer) throw new Error("customer not found");

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));

  const designRows = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.orderId, orderId))
    .orderBy(desc(schema.designs.version))
    .limit(3);

  const designs = await Promise.all(
    designRows.map(async (d) => ({
      version: d.version,
      status: d.status,
      imageData: d.fileUrl ? await loadImageAsDataUri(d.fileUrl) : null,
    }))
  );

  const stageRows = await db
    .select({
      stage: schema.productionStages.stage,
      status: schema.productionStages.status,
      assignedName: schema.users.name,
    })
    .from(schema.productionStages)
    .leftJoin(
      schema.users,
      eq(schema.productionStages.assignedTo, schema.users.id)
    )
    .where(eq(schema.productionStages.orderId, orderId));

  return renderToBuffer(
    WorkOrderPDF({
      order: {
        code: order.code,
        deadline: order.deadline,
        notes: order.notes,
        total: order.total,
        deposit: order.deposit,
        paid: order.paid,
        createdAt: order.createdAt,
        discount: order.discount,
        shipping: order.shipping,
        vatRate: order.vatRate,
        vatAmount: order.vatAmount,
        dealerDiscount: order.dealerDiscount,
        sizeSurcharge: order.sizeSurcharge,
        requiresDeposit: order.requiresDeposit,
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
      },
      items: items.map((it) => ({
        garmentType: it.garmentType,
        collar: it.collar,
        qty: it.qty,
        unitPrice: it.unitPrice ?? 0,
        sizeBreakdown: it.sizeBreakdown,
        note: it.note,
      })),
      designs,
      stages: stageRows as Array<{
        stage: ProductionStage;
        status: "pending" | "active" | "done";
        assignedName: string | null;
      }>,
    })
  );
}
