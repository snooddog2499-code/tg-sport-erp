"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";

const ROLES = [
  "owner",
  "manager",
  "admin",
  "graphic",
  "print",
  "roll",
  "laser",
  "sew",
  "qc",
  "dealer",
] as const;

const CreateSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  email: z
    .string()
    .min(1, "กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .transform((s) => s.toLowerCase().trim()),
  password: z
    .string()
    .min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร"),
  role: z.enum(ROLES),
  dept: z.string().optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  role: z.enum(ROLES),
  dept: z.string().optional(),
});

export type UserFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createUser(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requirePerm("settings:manage");
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { name, email, password, role, dept } = parsed.data;

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) {
    return { errors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"] } };
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      role,
      dept: dept?.trim() || null,
      passwordHash,
      active: true,
    })
    .returning();

  const actorId = await getCurrentUserId();
  await logAction({
    userId: actorId,
    action: "create",
    entity: "users",
    entityId: created.id,
    details: { email, name, role },
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings/permissions");
  redirect("/settings/users");
}

export async function updateUser(
  id: number,
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requirePerm("settings:manage");
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  await db
    .update(schema.users)
    .set({
      name: parsed.data.name,
      role: parsed.data.role,
      dept: parsed.data.dept?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.id, id));

  const actorId = await getCurrentUserId();
  await logAction({
    userId: actorId,
    action: "update",
    entity: "users",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings/permissions");
  redirect("/settings/users");
}

const ResetPasswordSchema = z.object({
  password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร"),
});

export async function resetUserPassword(
  id: number,
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requirePerm("settings:manage");
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(schema.users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, id));

  // Invalidate any active sessions for that user
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));

  const actorId = await getCurrentUserId();
  await logAction({
    userId: actorId,
    action: "update",
    entity: "users",
    entityId: id,
    details: { passwordReset: true },
  });

  revalidatePath("/settings/users");
  return { message: "เปลี่ยนรหัสผ่านแล้ว — ผู้ใช้จะต้องล็อกอินใหม่" };
}

export async function deleteUser(id: number): Promise<void> {
  await requirePerm("settings:manage");
  const [u] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!u) return;
  if (u.role === "owner") return; // never delete owner

  const actor = await getCurrentUserId();
  if (actor === id) return; // don't let user delete themselves

  // Null-out FK references so we can delete
  await db
    .update(schema.orders)
    .set({ assignedAdminId: null })
    .where(eq(schema.orders.assignedAdminId, id));
  await db
    .update(schema.orders)
    .set({ assignedGraphicId: null })
    .where(eq(schema.orders.assignedGraphicId, id));
  await db
    .update(schema.orders)
    .set({ createdBy: null })
    .where(eq(schema.orders.createdBy, id));
  await db
    .update(schema.productionStages)
    .set({ assignedTo: null })
    .where(eq(schema.productionStages.assignedTo, id));
  await db
    .update(schema.orderFiles)
    .set({ uploadedBy: null })
    .where(eq(schema.orderFiles.uploadedBy, id));
  await db
    .update(schema.employees)
    .set({ userId: null })
    .where(eq(schema.employees.userId, id));
  await db
    .update(schema.auditLog)
    .set({ userId: null })
    .where(eq(schema.auditLog.userId, id));

  // sessions and user_menu_access cascade-delete via FK
  await db.delete(schema.users).where(eq(schema.users.id, id));

  await logAction({
    userId: actor,
    action: "delete",
    entity: "users",
    entityId: id,
    details: { email: u.email, name: u.name, role: u.role },
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings/permissions");
}

export async function toggleUserActive(id: number): Promise<void> {
  await requirePerm("settings:manage");
  const [u] = await db
    .select({ id: schema.users.id, active: schema.users.active })
    .from(schema.users)
    .where(eq(schema.users.id, id));
  if (!u) return;

  await db
    .update(schema.users)
    .set({ active: !u.active, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, id));

  if (u.active) {
    // Was active, now disabling — kill sessions
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  }

  const actorId = await getCurrentUserId();
  await logAction({
    userId: actorId,
    action: "update",
    entity: "users",
    entityId: id,
    details: { active: !u.active },
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings/permissions");
}
