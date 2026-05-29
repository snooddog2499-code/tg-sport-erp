"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requirePerm, can } from "@/lib/permissions";
import { requireAuth } from "@/lib/auth";
import { nextFinanceDocNo } from "@/lib/finance-doc-number";

const LineSchema = z.object({
  description: z.string().min(1, "กรุณากรอกรายละเอียดรายการ"),
  qty: z.coerce.number().min(0.001, "จำนวนต้องมากกว่า 0"),
  unitPrice: z.coerce.number().min(0, "ราคาต้องไม่ติดลบ"),
});

const Schema = z.object({
  type: z.enum(["income", "expense"]),
  vendorName: z.string().min(1, "กรุณากรอกชื่อ"),
  vendorAddress: z.string().optional(),
  vendorTaxId: z.string().optional(),
  vendorBranch: z.string().optional(),
  docDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง"),
  creditDays: z.coerce.number().int().min(0).default(0),
  referenceNo: z.string().optional(),
  priceIncludesVat: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  description: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  vatEnabled: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  withholdingEnabled: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  withholdingPct: z.coerce.number().min(0).max(50).default(3),
});

export type FinanceDocFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

// Round to 2 decimals to avoid float drift on amounts
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function createFinanceDocument(
  _prev: FinanceDocFormState,
  formData: FormData
): Promise<FinanceDocFormState> {
  const user = await requirePerm("finance:manage");

  // Parse header
  const headerParsed = Schema.safeParse(Object.fromEntries(formData));
  if (!headerParsed.success) {
    return { errors: z.flattenError(headerParsed.error).fieldErrors };
  }
  const h = headerParsed.data;

  // Parse lines (parallel hidden arrays)
  const descs = formData.getAll("lineDescription").map(String);
  const qtys = formData.getAll("lineQty").map(String);
  const prices = formData.getAll("lineUnitPrice").map(String);
  const lineCount = Math.max(descs.length, qtys.length, prices.length);

  const lines: { description: string; qty: number; unitPrice: number; total: number }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const desc = descs[i] ?? "";
    const qty = qtys[i] ?? "";
    const price = prices[i] ?? "";
    // Skip completely empty rows
    if (!desc.trim() && !qty.trim() && !price.trim()) continue;
    const parsed = LineSchema.safeParse({ description: desc, qty, unitPrice: price });
    if (!parsed.success) {
      const errs = z.flattenError(parsed.error).fieldErrors;
      const first =
        errs.description?.[0] ?? errs.qty?.[0] ?? errs.unitPrice?.[0] ?? "ข้อมูลรายการไม่ถูกต้อง";
      return { errors: { lines: [`รายการที่ ${i + 1}: ${first}`] } };
    }
    const total = r2(parsed.data.qty * parsed.data.unitPrice);
    lines.push({ ...parsed.data, total });
  }

  if (lines.length === 0) {
    return { errors: { lines: ["กรุณาเพิ่มอย่างน้อย 1 รายการ"] } };
  }

  // Compute totals
  // priceIncludesVat = true → line totals already contain VAT, separate it out
  const VAT_RATE = 0.07;
  let subtotal: number;
  if (h.vatEnabled && h.priceIncludesVat) {
    // Each line total is gross; subtotal (net) = gross / 1.07
    subtotal = r2(lines.reduce((s, l) => s + l.total, 0) / (1 + VAT_RATE));
  } else {
    subtotal = r2(lines.reduce((s, l) => s + l.total, 0));
  }

  const discountAmount = r2((subtotal * h.discountPct) / 100);
  const afterDiscount = r2(subtotal - discountAmount);
  const vatAmount = h.vatEnabled ? r2(afterDiscount * VAT_RATE) : 0;
  const withholdingAmount = h.withholdingEnabled
    ? r2((afterDiscount * h.withholdingPct) / 100)
    : 0;
  const total = r2(afterDiscount + vatAmount - withholdingAmount);

  // Compute due date
  const dueDate = (() => {
    const d = new Date(h.docDate + "T00:00:00");
    d.setDate(d.getDate() + h.creditDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  })();

  // Generate doc number based on the doc date's year/month
  const docNo = await nextFinanceDocNo(h.type, new Date(h.docDate + "T00:00:00"));

  // Attachments (uploaded via direct-upload uploader)
  const attachmentUrls = formData.getAll("attachmentUrls").map(String).filter(Boolean);
  const attachmentNames = formData.getAll("attachmentNames").map(String);
  const attachmentMimes = formData.getAll("attachmentMimes").map(String);
  const attachmentSizes = formData
    .getAll("attachmentSizes")
    .map((v) => Number(v) || 0);

  const [doc] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(schema.financeDocuments)
      .values({
        docNo,
        type: h.type,
        vendorName: h.vendorName,
        vendorAddress: h.vendorAddress || null,
        vendorTaxId: h.vendorTaxId || null,
        vendorBranch: h.vendorBranch || null,
        docDate: h.docDate,
        creditDays: h.creditDays,
        dueDate,
        referenceNo: h.referenceNo || null,
        priceIncludesVat: !!h.priceIncludesVat,
        description: h.description || null,
        notes: h.notes || null,
        internalNotes: h.internalNotes || null,
        subtotal,
        discountPct: h.discountPct,
        discountAmount,
        afterDiscount,
        vatEnabled: !!h.vatEnabled,
        vatAmount,
        withholdingEnabled: !!h.withholdingEnabled,
        withholdingPct: h.withholdingPct,
        withholdingAmount,
        total,
        recordedBy: user.id,
      })
      .returning();

    if (lines.length > 0) {
      await tx.insert(schema.financeDocumentLines).values(
        lines.map((l, i) => ({
          documentId: inserted.id,
          lineNo: i + 1,
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice,
          total: l.total,
        }))
      );
    }

    if (attachmentUrls.length > 0) {
      await tx.insert(schema.financeDocumentFiles).values(
        attachmentUrls.map((url, i) => ({
          documentId: inserted.id,
          fileUrl: url,
          fileName: attachmentNames[i] ?? "file",
          mimeType: attachmentMimes[i] ?? "application/octet-stream",
          sizeBytes: attachmentSizes[i] ?? 0,
          uploadedBy: user.id,
        }))
      );
    }

    return [inserted];
  });

  await logAction({
    userId: user.id,
    action: "finance_doc_create",
    entity: "finance_document",
    entityId: doc.id,
    details: { docNo, type: h.type, vendor: h.vendorName, total },
  });

  revalidatePath("/finance");
  redirect(`/finance/${doc.id}`);
}

const DeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function deleteFinanceDocument(
  _prev: FinanceDocFormState,
  formData: FormData
): Promise<FinanceDocFormState> {
  const user = await requireAuth();
  if (!can(user.role, "finance:manage")) {
    return { message: "ไม่มีสิทธิ์ลบเอกสาร" };
  }

  const parsed = DeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { id } = parsed.data;
  const [doc] = await db
    .select()
    .from(schema.financeDocuments)
    .where(eq(schema.financeDocuments.id, id));
  if (!doc) return { message: "ไม่พบเอกสาร" };

  await db.delete(schema.financeDocuments).where(eq(schema.financeDocuments.id, id));

  await logAction({
    userId: user.id,
    action: "finance_doc_delete",
    entity: "finance_document",
    entityId: id,
    details: { docNo: doc.docNo, type: doc.type, total: doc.total },
  });

  revalidatePath("/finance");
  return { success: true, message: `ลบเอกสาร ${doc.docNo} แล้ว` };
}
