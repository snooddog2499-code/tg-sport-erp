"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const CustomerSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  tier: z.enum(["new", "regular", "vip"]).default("new"),
  freeShipping: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  defaultDiscountPct: z.coerce.number().min(0).max(100).default(0),
  note: z.string().optional(),
});

export type CustomerFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await requirePerm("customer:create");
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const userId = await getCurrentUserId();

  const [inserted] = await db
    .insert(schema.customers)
    .values(parsed.data)
    .returning();

  await logAction({
    userId,
    action: "create",
    entity: "customer",
    entityId: inserted.id,
    details: { name: parsed.data.name },
  });

  revalidatePath("/customers");
  revalidatePath("/");
  redirect(`/customers/${inserted.id}`);
}

export async function updateCustomer(
  id: number,
  _prev: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await requirePerm("customer:edit");
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const userId = await getCurrentUserId();

  await db
    .update(schema.customers)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(schema.customers.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "customer",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: number) {
  await requirePerm("customer:delete");
  const userId = await getCurrentUserId();
  await db.delete(schema.customers).where(eq(schema.customers.id, id));
  await logAction({
    userId,
    action: "delete",
    entity: "customer",
    entityId: id,
  });
  revalidatePath("/customers");
  redirect("/customers");
}
