"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";
import { MENU_ITEMS, defaultAllows } from "@/lib/menu-access";

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

  // Fetch the target user's role + their current overrides together.
  // We need the role to materialise defaults when this is the first
  // toggle on a user that's been relying on role-based defaults so far.
  const [[targetUser], existingOverrides] = await Promise.all([
    db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId)),
    db
      .select({ menuKey: schema.userMenuAccess.menuKey })
      .from(schema.userMenuAccess)
      .where(eq(schema.userMenuAccess.userId, userId)),
  ]);
  if (!targetUser) return;

  // Compute the *effective* current allowed set. If the user has no
  // overrides yet, defaults apply — we materialise them so toggling a
  // single menu doesn't silently wipe out the rest of the defaults
  // (the previous bug: a fresh admin had no overrides, so toggling
  //  one menu created a 1-row override list that became the entire
  //  visible menu, hiding everything else).
  let allowedSet: Set<string>;
  if (existingOverrides.length === 0) {
    allowedSet = new Set(
      MENU_ITEMS.filter((m) => defaultAllows(targetUser.role, m)).map(
        (m) => m.key
      )
    );
  } else {
    allowedSet = new Set(existingOverrides.map((o) => o.menuKey));
  }

  // Apply the toggle
  if (isAllowed) allowedSet.add(menuKey);
  else allowedSet.delete(menuKey);

  // Replace this user's overrides with the new full set in one txn.
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.userMenuAccess)
      .where(eq(schema.userMenuAccess.userId, userId));
    if (allowedSet.size > 0) {
      const now = new Date().toISOString();
      await tx.insert(schema.userMenuAccess).values(
        [...allowedSet].map((key) => ({
          userId,
          menuKey: key,
          updatedAt: now,
        }))
      );
    }
  });

  await logAction({
    userId: actorId,
    action: "update",
    entity: "menu_access",
    entityId: userId,
    details: { menuKey, allowed: isAllowed, totalAllowed: allowedSet.size },
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
