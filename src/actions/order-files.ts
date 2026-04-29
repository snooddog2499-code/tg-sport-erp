"use server";

import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import {
  saveOrderFile,
  deleteOrderFile as removeOrderFileFromDisk,
  ORDER_FILE_ACCEPT,
  MAX_ORDER_FILE_SIZE,
} from "@/lib/uploads";

export type OrderFileFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function uploadOrderFiles(
  orderId: number,
  _prev: OrderFileFormState,
  formData: FormData
): Promise<OrderFileFormState> {
  await requirePerm("item:manage");

  const files = formData.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
  const note = (formData.get("note") as string | null)?.trim() || null;

  if (files.length === 0) {
    return { errors: { files: ["กรุณาเลือกไฟล์"] } };
  }

  const [existingOrder] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!existingOrder) {
    return { errors: { files: ["ไม่พบออเดอร์"] } };
  }

  for (const f of files) {
    if (f.size > MAX_ORDER_FILE_SIZE) {
      return {
        errors: {
          files: [
            `ไฟล์ "${f.name}" ใหญ่เกิน ${Math.round(
              MAX_ORDER_FILE_SIZE / 1024 / 1024
            )} MB`,
          ],
        },
      };
    }
    if (!ORDER_FILE_ACCEPT.includes(f.type)) {
      return {
        errors: {
          files: [`ไฟล์ "${f.name}" รูปแบบไม่รองรับ (${f.type})`],
        },
      };
    }
  }

  const userId = await getCurrentUserId();
  const insertedIds: number[] = [];

  for (const file of files) {
    const { publicUrl } = await saveOrderFile(orderId, file);
    const [inserted] = await db
      .insert(schema.orderFiles)
      .values({
        orderId,
        fileUrl: publicUrl,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        note,
        uploadedBy: userId ?? null,
      })
      .returning();
    insertedIds.push(inserted.id);
  }

  await logAction({
    userId,
    action: "create",
    entity: "order_file",
    entityId: insertedIds[0] ?? 0,
    details: { orderId, count: files.length, ids: insertedIds },
  });

  revalidatePath(`/orders/${orderId}`);
  return { message: `อัปโหลด ${files.length} ไฟล์แล้ว` };
}

export async function deleteOrderFile(id: number) {
  await requirePerm("item:manage");
  const [row] = await db
    .select()
    .from(schema.orderFiles)
    .where(eq(schema.orderFiles.id, id))
    .limit(1);
  if (!row) return;

  await removeOrderFileFromDisk(row.fileUrl);
  await db.delete(schema.orderFiles).where(eq(schema.orderFiles.id, id));

  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "delete",
    entity: "order_file",
    entityId: id,
    details: { orderId: row.orderId, fileName: row.fileName },
  });

  revalidatePath(`/orders/${row.orderId}`);
}

export async function listOrderFiles(orderId: number) {
  return db
    .select()
    .from(schema.orderFiles)
    .where(eq(schema.orderFiles.orderId, orderId))
    .orderBy(desc(schema.orderFiles.createdAt));
}
