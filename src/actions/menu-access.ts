"use server";

import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { MENU_ITEMS } from "@/lib/menu-access";

const ToggleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  menuKey: z.string().min(1),
  allowed: z.union([z.literal("true"), z.literal("false")]),
});

export async function toggleUserMenuAccess(formData: FormData): Promise<void> {
  await requirePerm("settings:manage");
  const parsed = ToggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const { userId, menuKey, allowed } = parsed.data;
  if (!MENU_ITEMS.some((m) => m.key === menuKey)) return;

  const actorId = await getCurrentUserId();
  const isAllowed = allowed === "true";

  if (isAllowed) {
    // Insert if not exists
    const [existing] = await db
      .select()
      .from(schema.userMenuAccess)
      .where(
        and(
          eq(schema.userMenuAccess.userId, userId),
          eq(schema.userMenuAccess.menuKey, menuKey)
        )
      )
      .limit(1);
    if (!existing) {
      await db.insert(schema.userMenuAccess).values({
        userId,
        menuKey,
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    await db
      .delete(schema.userMenuAccess)
      .where(
        and(
          eq(schema.userMenuAccess.userId, userId),
          eq(schema.userMenuAccess.menuKey, menuKey)
        )
      );
  }

  await logAction({
    userId: actorId,
    action: "update",
    entity: "menu_access",
    entityId: userId,
    details: { menuKey, allowed: isAllowed },
  });

  revalidatePath("/settings/permissions");
  revalidatePath("/", "layout");
}

export async function resetUserMenuAccess(userId: number): Promise<void> {
  await requirePerm("settings:manage");
  const actorId = await getCurrentUserId();
  await db
    .delete(schema.userMenuAccess)
    .where(eq(schema.userMenuAccess.userId, userId));
  await logAction({
    userId: actorId,
    action: "delete",
    entity: "menu_access",
    entityId: userId,
    details: { reset: true },
  });
  revalidatePath("/settings/permissions");
  revalidatePath("/", "layout");
}
