import "server-only";
import { redirect } from "next/navigation";
import { requireAuth, getCurrentUser, type CurrentUser } from "./auth";

export type Role = CurrentUser["role"];

export type Permission =
  | "order:create"
  | "order:edit"
  | "order:delete"
  | "order:status"
  | "customer:create"
  | "customer:edit"
  | "customer:delete"
  | "item:manage"
  | "payment:record"
  | "design:manage"
  | "stage:advance"
  | "stage:assign"
  | "audit:view"
  | "material:manage"
  | "material:use"
  | "hr:manage"
  | "hr:attendance"
  | "reports:view"
  | "dealer:manage"
  | "dealer:self"
  | "settings:manage";

const ADMIN_SET: Permission[] = [
  "order:create",
  "order:edit",
  "order:status",
  "customer:create",
  "customer:edit",
  "item:manage",
  "payment:record",
  "design:manage",
  "stage:assign",
  "audit:view",
  "material:manage",
  "material:use",
  "hr:attendance",
  "reports:view",
  "dealer:manage",
];

const DEALER_SET: Permission[] = [
  "order:create",
  "dealer:self",
];

const WORKER_SET: Permission[] = ["stage:advance", "material:use"];

const GRAPHIC_SET: Permission[] = [
  "design:manage",
  "stage:advance",
  "order:status",
  "material:use",
];

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "order:create",
    "order:edit",
    "order:delete",
    "order:status",
    "customer:create",
    "customer:edit",
    "customer:delete",
    "item:manage",
    "payment:record",
    "design:manage",
    "stage:advance",
    "stage:assign",
    "audit:view",
    "material:manage",
    "material:use",
    "hr:manage",
    "hr:attendance",
    "reports:view",
    "dealer:manage",
    "settings:manage",
  ],
  manager: [
    "order:create",
    "order:edit",
    "order:delete",
    "order:status",
    "customer:create",
    "customer:edit",
    "customer:delete",
    "item:manage",
    "payment:record",
    "design:manage",
    "stage:advance",
    "stage:assign",
    "audit:view",
    "material:manage",
    "material:use",
  ],
  admin: ADMIN_SET,
  graphic: GRAPHIC_SET,
  print: WORKER_SET,
  roll: WORKER_SET,
  laser: WORKER_SET,
  sew: WORKER_SET,
  qc: [...WORKER_SET, "order:status"],
  dealer: DEALER_SET,
};

export function can(role: Role, perm: Permission): boolean {
  return PERMISSIONS[role]?.includes(perm) ?? false;
}

export async function requirePerm(perm: Permission): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!can(user.role, perm)) redirect("/forbidden");
  return user;
}

export async function getUserAndPerm(
  perm: Permission
): Promise<{ user: CurrentUser; allowed: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { user, allowed: can(user.role, perm) };
}
