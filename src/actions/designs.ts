"use server";

import { db, schema } from "@/db";
import { desc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { notifyCustomerDesignSent } from "@/lib/line";
import { headers } from "next/headers";
import {
  saveDesignFile,
  deleteDesignFile,
  DESIGN_ACCEPT,
  MAX_DESIGN_SIZE,
} from "@/lib/uploads";

export type DesignFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

const DESIGN_STATUSES = ["draft", "sent", "approved", "revision"] as const;
type DesignStatus = (typeof DESIGN_STATUSES)[number];

export async function uploadDesign(
  orderId: number,
  _prev: DesignFormState,
  formData: FormData
): Promise<DesignFormState> {
  await requirePerm("design:manage");
  const file = formData.get("file");
  const note = (formData.get("note") as string | null)?.trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: ["กรุณาเลือกไฟล์"] } };
  }
  if (file.size > MAX_DESIGN_SIZE) {
    return {
      errors: {
        file: [`ไฟล์ใหญ่เกิน ${Math.round(MAX_DESIGN_SIZE / 1024 / 1024)} MB`],
      },
    };
  }
  if (!DESIGN_ACCEPT.includes(file.type)) {
    return {
      errors: { file: ["อัปโหลดได้เฉพาะรูปภาพ (JPG/PNG/WEBP/GIF) หรือ PDF"] },
    };
  }

  const [existingOrder] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!existingOrder) {
    return { message: "ไม่พบออเดอร์" };
  }

  const [row] = await db
    .select({ maxVersion: max(schema.designs.version) })
    .from(schema.designs)
    .where(eq(schema.designs.orderId, orderId));
  const nextVersion = (row?.maxVersion ?? 0) + 1;

  const { publicUrl } = await saveDesignFile(orderId, file, nextVersion);

  const userId = await getCurrentUserId();

  const [inserted] = await db
    .insert(schema.designs)
    .values({
      orderId,
      fileUrl: publicUrl,
      version: nextVersion,
      status: "draft",
      note,
    })
    .returning();

  await logAction({
    userId,
    action: "create",
    entity: "design",
    entityId: inserted.id,
    details: { orderId, version: nextVersion, fileName: file.name },
  });

  revalidatePath(`/orders/${orderId}`);
  return { message: `อัปโหลด v${nextVersion} สำเร็จ` };
}

export async function deleteDesign(designId: number) {
  await requirePerm("design:manage");
  const [row] = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.id, designId))
    .limit(1);
  if (!row) return;

  if (row.fileUrl) {
    await deleteDesignFile(row.fileUrl);
  }

  await db.delete(schema.designs).where(eq(schema.designs.id, designId));

  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "delete",
    entity: "design",
    entityId: designId,
    details: { orderId: row.orderId, version: row.version },
  });

  revalidatePath(`/orders/${row.orderId}`);
}

export async function updateDesignStatus(
  designId: number,
  status: DesignStatus
) {
  await requirePerm("design:manage");
  if (!DESIGN_STATUSES.includes(status)) return;

  const [row] = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.id, designId))
    .limit(1);
  if (!row) return;

  const patch: Partial<typeof schema.designs.$inferInsert> = { status };
  const nowIso = new Date().toISOString();
  if (status === "sent" && !row.sentAt) patch.sentAt = nowIso;
  if (status === "sent" && !row.approvalToken) {
    patch.approvalToken = randomBytes(24).toString("base64url");
  }
  if (status === "approved" && !row.approvedAt) patch.approvedAt = nowIso;

  await db
    .update(schema.designs)
    .set(patch)
    .where(eq(schema.designs.id, designId));

  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "status_change",
    entity: "design",
    entityId: designId,
    details: { orderId: row.orderId, from: row.status, to: status },
  });

  if (status === "sent") {
    const token = patch.approvalToken ?? row.approvalToken;
    if (token) {
      const [orderCustomer] = await db
        .select({
          lineId: schema.customers.lineId,
          customerName: schema.customers.name,
          orderCode: schema.orders.code,
        })
        .from(schema.orders)
        .leftJoin(
          schema.customers,
          eq(schema.orders.customerId, schema.customers.id)
        )
        .where(eq(schema.orders.id, row.orderId))
        .limit(1);

      if (orderCustomer?.lineId) {
        const h = await headers();
        const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
        const protocol = h.get("x-forwarded-proto") ?? "http";
        const approvalUrl = `${protocol}://${host}/approve/${token}`;
        await notifyCustomerDesignSent({
          customerLineId: orderCustomer.lineId,
          customerName: orderCustomer.customerName ?? "ลูกค้า",
          orderCode: orderCustomer.orderCode ?? "",
          approvalUrl,
          version: row.version,
        });
      }
    }
  }

  revalidatePath(`/orders/${row.orderId}`);
}

export async function listDesigns(orderId: number) {
  return db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.orderId, orderId))
    .orderBy(desc(schema.designs.version));
}
