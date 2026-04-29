"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { saveAttendancePhoto } from "@/lib/uploads";

const PHOTO_MAX = 8 * 1024 * 1024;
const PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const AttendanceSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  date: z.string().min(8),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  otHours: z.coerce.number().min(0).default(0),
});

export type AttendanceFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function recordAttendance(
  _prev: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  await requirePerm("hr:attendance");
  const parsed = AttendanceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { employeeId, date, checkIn, checkOut, otHours } = parsed.data;

  const userId = await getCurrentUserId();

  const [existing] = await db
    .select()
    .from(schema.attendance)
    .where(
      and(
        eq(schema.attendance.employeeId, employeeId),
        eq(schema.attendance.date, date)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.attendance)
      .set({
        checkIn: checkIn || existing.checkIn,
        checkOut: checkOut || existing.checkOut,
        otHours: otHours ?? existing.otHours,
      })
      .where(eq(schema.attendance.id, existing.id));

    await logAction({
      userId,
      action: "attendance_recorded",
      entity: "attendance",
      entityId: existing.id,
      details: { employeeId, date, checkIn, checkOut, otHours, updated: true },
    });
  } else {
    const [inserted] = await db
      .insert(schema.attendance)
      .values({
        employeeId,
        date,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        otHours,
      })
      .returning();

    await logAction({
      userId,
      action: "attendance_recorded",
      entity: "attendance",
      entityId: inserted.id,
      details: { employeeId, date, checkIn, checkOut, otHours },
    });
  }

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
  return { message: "บันทึกเวลาแล้ว" };
}

export async function quickCheckIn(
  employeeId: number,
  type: "in" | "out"
) {
  await requirePerm("hr:attendance");
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);

  const [existing] = await db
    .select()
    .from(schema.attendance)
    .where(
      and(
        eq(schema.attendance.employeeId, employeeId),
        eq(schema.attendance.date, date)
      )
    )
    .limit(1);

  const userId = await getCurrentUserId();

  if (existing) {
    const patch =
      type === "in" && !existing.checkIn
        ? { checkIn: time }
        : type === "out"
          ? { checkOut: time }
          : null;
    if (patch) {
      await db
        .update(schema.attendance)
        .set(patch)
        .where(eq(schema.attendance.id, existing.id));
      await logAction({
        userId,
        action: "attendance_recorded",
        entity: "attendance",
        entityId: existing.id,
        details: { employeeId, date, ...patch, quick: true },
      });
    }
  } else {
    const values = {
      employeeId,
      date,
      checkIn: type === "in" ? time : null,
      checkOut: type === "out" ? time : null,
      otHours: 0,
    };
    const [inserted] = await db
      .insert(schema.attendance)
      .values(values)
      .returning();
    await logAction({
      userId,
      action: "attendance_recorded",
      entity: "attendance",
      entityId: inserted.id,
      details: { ...values, quick: true },
    });
  }

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
}

export type CheckInState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export async function checkInWithPhoto(
  employeeId: number,
  type: "in" | "out",
  _prev: CheckInState,
  formData: FormData
): Promise<CheckInState> {
  await requirePerm("hr:attendance");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาถ่ายรูปยืนยันตัวตน" };
  }
  if (file.size > PHOTO_MAX) {
    return {
      error: `ไฟล์ใหญ่เกิน ${Math.round(PHOTO_MAX / 1024 / 1024)} MB`,
    };
  }
  if (!PHOTO_MIMES.includes(file.type)) {
    return { error: `รูปแบบไฟล์ไม่รองรับ (${file.type})` };
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);

  const [emp] = await db
    .select({ id: schema.employees.id })
    .from(schema.employees)
    .where(eq(schema.employees.id, employeeId))
    .limit(1);
  if (!emp) {
    return { error: "ไม่พบพนักงาน" };
  }

  const { publicUrl } = await saveAttendancePhoto(employeeId, date, type, file);

  const [existing] = await db
    .select()
    .from(schema.attendance)
    .where(
      and(
        eq(schema.attendance.employeeId, employeeId),
        eq(schema.attendance.date, date)
      )
    )
    .limit(1);

  const userId = await getCurrentUserId();

  if (existing) {
    const patch: Partial<typeof schema.attendance.$inferInsert> = {};
    if (type === "in") {
      if (existing.checkIn) {
        return { error: "บันทึกเวลาเข้างานไปแล้วในวันนี้" };
      }
      patch.checkIn = time;
      patch.checkInPhoto = publicUrl;
    } else {
      patch.checkOut = time;
      patch.checkOutPhoto = publicUrl;
    }
    await db
      .update(schema.attendance)
      .set(patch)
      .where(eq(schema.attendance.id, existing.id));
    await logAction({
      userId,
      action: "attendance_recorded",
      entity: "attendance",
      entityId: existing.id,
      details: { employeeId, date, type, time, photo: publicUrl },
    });
  } else {
    const values = {
      employeeId,
      date,
      checkIn: type === "in" ? time : null,
      checkOut: type === "out" ? time : null,
      checkInPhoto: type === "in" ? publicUrl : null,
      checkOutPhoto: type === "out" ? publicUrl : null,
      otHours: 0,
    };
    const [inserted] = await db
      .insert(schema.attendance)
      .values(values)
      .returning();
    await logAction({
      userId,
      action: "attendance_recorded",
      entity: "attendance",
      entityId: inserted.id,
      details: { ...values, withPhoto: true },
    });
  }

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
  return {
    ok: true,
    message: type === "in" ? `เข้างาน ${time} ✓` : `ออกงาน ${time} ✓`,
  };
}

export async function deleteAttendance(id: number, employeeId: number) {
  await requirePerm("hr:attendance");
  await db.delete(schema.attendance).where(eq(schema.attendance.id, id));
  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "delete",
    entity: "attendance",
    entityId: id,
    details: { employeeId },
  });
  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
}
