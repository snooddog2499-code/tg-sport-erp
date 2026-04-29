"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const DealerSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  commissionPct: z.coerce.number().min(0).max(100).default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  note: z.string().optional(),
});

export type DealerFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createDealer(
  _prev: DealerFormState,
  formData: FormData
): Promise<DealerFormState> {
  await requirePerm("dealer:manage");
  const parsed = DealerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();
  const [inserted] = await db
    .insert(schema.dealers)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      lineId: parsed.data.lineId || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      commissionPct: parsed.data.commissionPct,
      discountPct: parsed.data.discountPct,
      note: parsed.data.note || null,
    })
    .returning();

  await logAction({
    userId,
    action: "create",
    entity: "dealer",
    entityId: inserted.id,
    details: { name: parsed.data.name },
  });

  revalidatePath("/dealers");
  redirect(`/dealers/${inserted.id}`);
}

export async function updateDealer(
  id: number,
  _prev: DealerFormState,
  formData: FormData
): Promise<DealerFormState> {
  await requirePerm("dealer:manage");
  const parsed = DealerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const userId = await getCurrentUserId();

  await db
    .update(schema.dealers)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      lineId: parsed.data.lineId || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      commissionPct: parsed.data.commissionPct,
      discountPct: parsed.data.discountPct,
      note: parsed.data.note || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.dealers.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "dealer",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath(`/dealers/${id}`);
  revalidatePath("/dealers");
  redirect(`/dealers/${id}`);
}

export async function toggleDealerActive(id: number) {
  await requirePerm("dealer:manage");
  const [dealer] = await db
    .select()
    .from(schema.dealers)
    .where(eq(schema.dealers.id, id));
  if (!dealer) return;

  await db
    .update(schema.dealers)
    .set({ active: !dealer.active, updatedAt: new Date().toISOString() })
    .where(eq(schema.dealers.id, id));

  const userId = await getCurrentUserId();
  await logAction({
    userId,
    action: "update",
    entity: "dealer",
    entityId: id,
    details: { active: !dealer.active },
  });

  revalidatePath(`/dealers/${id}`);
  revalidatePath("/dealers");
}
