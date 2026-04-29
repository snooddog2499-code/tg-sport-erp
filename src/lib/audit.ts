import { db, schema } from "@/db";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "payment_recorded"
  | "stage_advanced"
  | "stage_reverted"
  | "stage_assigned"
  | "login"
  | "logout"
  | "restock"
  | "stock_adjust"
  | "material_used"
  | "attendance_recorded"
  | "payroll_finalized";

export type AuditEntity =
  | "order"
  | "customer"
  | "order_item"
  | "payment"
  | "production_stage"
  | "design"
  | "users"
  | "material"
  | "material_usage"
  | "employee"
  | "attendance"
  | "dealer"
  | "dealer_price"
  | "order_file"
  | "menu_access";

export async function logAction(params: {
  userId?: number | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: number;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.auditLog).values({
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (err) {
    console.error("[audit] failed:", err);
  }
}
