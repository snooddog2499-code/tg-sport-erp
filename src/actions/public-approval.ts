"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";

export type ApprovalState = {
  message?: string;
  error?: string;
};

const DecisionSchema = z.object({
  token: z.string().min(8),
  decision: z.enum(["approved", "revision"]),
  note: z.string().optional(),
});

export async function submitDesignDecision(
  _prev: ApprovalState,
  formData: FormData
): Promise<ApprovalState> {
  const parsed = DecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "ข้อมูลไม่ถูกต้อง" };
  }
  const { token, decision, note } = parsed.data;

  const [design] = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.approvalToken, token))
    .limit(1);

  if (!design) {
    return { error: "ลิงก์ไม่ถูกต้องหรือหมดอายุ" };
  }
  if (design.status === "approved") {
    return { error: "ลายนี้ถูกอนุมัติแล้ว" };
  }

  const nowIso = new Date().toISOString();
  const patch: Partial<typeof schema.designs.$inferInsert> = {
    status: decision,
  };
  if (decision === "approved") patch.approvedAt = nowIso;
  if (note && note.trim()) {
    const existing = design.note ? `${design.note}\n` : "";
    patch.note = `${existing}[ลูกค้า] ${note.trim()}`;
  }

  await db
    .update(schema.designs)
    .set(patch)
    .where(eq(schema.designs.id, design.id));

  await logAction({
    userId: null,
    action: "status_change",
    entity: "design",
    entityId: design.id,
    details: {
      orderId: design.orderId,
      from: design.status,
      to: decision,
      by: "customer",
    },
  });

  revalidatePath(`/orders/${design.orderId}`);

  return {
    message:
      decision === "approved"
        ? "ขอบคุณที่อนุมัติลายครับ ทีมงานจะเริ่มผลิตต่อไป"
        : "รับข้อความแก้ไขแล้ว ทีมงานจะติดต่อกลับเร็ว ๆ นี้",
  };
}
