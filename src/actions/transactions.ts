"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requirePerm, can } from "@/lib/permissions";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  type: z.enum(["income", "expense"], { message: "กรุณาเลือกประเภท" }),
  category: z.string().min(1, "กรุณาเลือกหมวด"),
  description: z.string().min(1, "กรุณากรอกรายละเอียด"),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0"),
  note: z.string().optional(),
});

export type TxnFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createTransaction(
  _prev: TxnFormState,
  formData: FormData
): Promise<TxnFormState> {
  const user = await requirePerm("finance:manage");

  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { entryDate, type, category, description, amount, note } = parsed.data;

  const [inserted] = await db
    .insert(schema.transactions)
    .values({
      entryDate,
      type,
      category,
      description,
      amount,
      note: note || null,
      recordedBy: user.id,
    })
    .returning({ id: schema.transactions.id });

  await logAction({
    userId: user.id,
    action: "transaction_create",
    entity: "transaction",
    entityId: inserted.id,
    details: { entryDate, type, category, amount, description },
  });

  // Invalidate the month the entry belongs to (revalidatePath ignores
  // query params so just revalidate the base path)
  revalidatePath("/finance");

  return {
    success: true,
    message: `บันทึก${type === "income" ? "รายรับ" : "รายจ่าย"} ${amount.toLocaleString("th-TH")} บาท`,
  };
}

const DeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function deleteTransaction(
  _prev: TxnFormState,
  formData: FormData
): Promise<TxnFormState> {
  const user = await requireAuth();
  if (!can(user.role, "finance:manage")) {
    return { message: "ไม่มีสิทธิ์ลบรายการ" };
  }

  const parsed = DeleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { id } = parsed.data;
  const [row] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.id, id));
  if (!row) return { message: "ไม่พบรายการ" };

  await db.delete(schema.transactions).where(eq(schema.transactions.id, id));

  await logAction({
    userId: user.id,
    action: "transaction_delete",
    entity: "transaction",
    entityId: id,
    details: {
      type: row.type,
      category: row.category,
      amount: row.amount,
      description: row.description,
    },
  });

  revalidatePath("/finance");
  return { success: true, message: "ลบรายการแล้ว" };
}
