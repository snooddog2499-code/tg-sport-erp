import "server-only";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { CurrentUser } from "./auth";
import {
  MENU_ITEMS,
  levelAllows,
  type AccessLevel,
  type MenuItem,
} from "./menu-access-types";

export {
  MENU_ITEMS,
  ACCESS_LEVEL_LABEL,
  ACCESS_LEVEL_HINT,
  levelAllows,
} from "./menu-access-types";
export type { AccessLevel, MenuItem } from "./menu-access-types";

export async function loadUserMenuKeys(
  userId: number
): Promise<Set<string>> {
  const rows = await db
    .select({ menuKey: schema.userMenuAccess.menuKey })
    .from(schema.userMenuAccess)
    .where(eq(schema.userMenuAccess.userId, userId));
  return new Set(rows.map((r) => r.menuKey));
}

export async function loadAllMenuOverrides(): Promise<
  Map<number, Set<string>>
> {
  const rows = await db
    .select({
      userId: schema.userMenuAccess.userId,
      menuKey: schema.userMenuAccess.menuKey,
    })
    .from(schema.userMenuAccess);
  const map = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.userId)) map.set(r.userId, new Set());
    map.get(r.userId)!.add(r.menuKey);
  }
  return map;
}

// Default menu visibility based on user role + menu default level
function defaultVisibleKeys(role: string): Set<string> {
  return new Set(
    MENU_ITEMS.filter((item) => levelAllows(role, item.defaultLevel)).map(
      (item) => item.key
    )
  );
}

export async function filterMenuItemsForUser(
  user: Pick<CurrentUser, "id" | "role">
): Promise<MenuItem[]> {
  // Owner always sees everything
  if (user.role === "owner") return MENU_ITEMS;

  // Check if this user has any explicit overrides
  const userKeys = await loadUserMenuKeys(user.id);
  if (userKeys.size === 0) {
    // No overrides — use role-based defaults
    const defaults = defaultVisibleKeys(user.role);
    return MENU_ITEMS.filter((item) => defaults.has(item.key));
  }
  // Use explicit overrides only
  return MENU_ITEMS.filter((item) => userKeys.has(item.key));
}

// Legacy: load default access levels (kept for backwards-compatibility, no longer used by sidebar)
export async function loadMenuAccess(): Promise<Record<string, AccessLevel>> {
  const result: Record<string, AccessLevel> = {};
  for (const item of MENU_ITEMS) {
    result[item.key] = item.defaultLevel;
  }
  return result;
}
