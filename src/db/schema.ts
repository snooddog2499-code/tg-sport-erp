import {
  pgTable,
  serial,
  integer,
  text,
  doublePrecision as real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: text("role", {
    enum: [
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
    ],
  }).notNull(),
  dept: text("dept"),
  dealerId: integer("dealer_id"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const dealers = pgTable("dealers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  lineId: text("line_id"),
  email: text("email"),
  address: text("address"),
  commissionPct: real("commission_pct").notNull().default(0),
  discountPct: real("discount_pct").notNull().default(0),
  note: text("note"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const dealerPrices = pgTable("dealer_prices", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id")
    .notNull()
    .references(() => dealers.id, { onDelete: "cascade" }),
  garmentType: text("garment_type").notNull(),
  price: real("price").notNull().default(0),
  minQty: integer("min_qty").notNull().default(1),
  note: text("note"),
  ...timestamps,
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  lineId: text("line_id"),
  email: text("email"),
  address: text("address"),
  tier: text("tier", { enum: ["new", "regular", "vip"] })
    .notNull()
    .default("new"),
  freeShipping: boolean("free_shipping").notNull().default(false),
  defaultDiscountPct: real("default_discount_pct").notNull().default(0),
  note: text("note"),
  ...timestamps,
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  status: text("status", {
    enum: [
      "received",
      "quoted",
      "approved",
      "in_production",
      "qc",
      "ready",
      "delivered",
      "paid",
      "cancelled",
    ],
  })
    .notNull()
    .default("received"),
  deadline: text("deadline"),
  notes: text("notes"),
  total: real("total").notNull().default(0),
  deposit: real("deposit").notNull().default(0),
  paid: real("paid").notNull().default(0),
  discount: real("discount").notNull().default(0),
  shipping: real("shipping").notNull().default(0),
  vatRate: real("vat_rate").notNull().default(0),
  vatAmount: real("vat_amount").notNull().default(0),
  sizeSurcharge: real("size_surcharge").notNull().default(0),
  requiresDeposit: boolean("requires_deposit").notNull().default(true),
  assignedAdminId: integer("assigned_admin_id").references(() => users.id),
  assignedGraphicId: integer("assigned_graphic_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  dealerId: integer("dealer_id").references(() => dealers.id),
  dealerDiscount: real("dealer_discount").notNull().default(0),
  dealerCommission: real("dealer_commission").notNull().default(0),
  cancelReason: text("cancel_reason"),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  garmentType: text("garment_type").notNull(),
  collar: text("collar"),
  qty: integer("qty").notNull(),
  sizeBreakdown: text("size_breakdown"),
  unitPrice: real("unit_price").notNull().default(0),
  note: text("note"),
});

export const orderFiles = pgTable("order_files", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  note: text("note"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const designs = pgTable("designs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fileUrl: text("file_url"),
  version: integer("version").notNull().default(1),
  status: text("status", {
    enum: ["draft", "sent", "approved", "revision"],
  })
    .notNull()
    .default("draft"),
  approvalToken: text("approval_token"),
  sentAt: text("sent_at"),
  approvedAt: text("approved_at"),
  note: text("note"),
  ...timestamps,
});

export const productionStageEnum = [
  "graphic",
  "print",
  "roll",
  "laser",
  "sew",
  "qc",
  "pack",
  "ship",
] as const;

export type ProductionStage = (typeof productionStageEnum)[number];

export const productionStages = pgTable("production_stages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  stage: text("stage", { enum: productionStageEnum }).notNull(),
  status: text("status", { enum: ["pending", "active", "done"] })
    .notNull()
    .default("pending"),
  assignedTo: integer("assigned_to").references(() => users.id),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  note: text("note"),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  stock: real("stock").notNull().default(0),
  reorderPoint: real("reorder_point").notNull().default(0),
  costPerUnit: real("cost_per_unit").notNull().default(0),
  supplier: text("supplier"),
  ...timestamps,
});

export const materialUsage = pgTable("material_usage", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  materialId: integer("material_id")
    .notNull()
    .references(() => materials.id),
  qtyUsed: real("qty_used").notNull(),
  recordedAt: timestamp("recorded_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const materialWithdrawals = pgTable("material_withdrawals", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id")
    .notNull()
    .references(() => materials.id),
  qty: real("qty").notNull(),
  dept: text("dept").notNull(),
  withdrawnBy: integer("withdrawn_by")
    .notNull()
    .references(() => users.id),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  note: text("note"),
  withdrawnAt: timestamp("withdrawn_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  pdfUrl: text("pdf_url"),
  sentAt: text("sent_at"),
  acceptedAt: text("accepted_at"),
  ...timestamps,
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  invoiceNo: text("invoice_no").notNull().unique(),
  pdfUrl: text("pdf_url"),
  issuedAt: timestamp("issued_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: text("paid_at"),
  amount: real("amount").notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  method: text("method", {
    enum: ["cash", "transfer", "promptpay", "credit_card", "other"],
  }).notNull(),
  amount: real("amount").notNull(),
  receivedAt: timestamp("received_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  dept: text("dept").notNull(),
  salary: real("salary").notNull().default(0),
  salaryType: text("salary_type", {
    enum: ["monthly", "daily", "piece"],
  })
    .notNull()
    .default("monthly"),
  startDate: text("start_date"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  checkInPhoto: text("check_in_photo"),
  checkOutPhoto: text("check_out_photo"),
  otHours: real("ot_hours").notNull().default(0),
});

export const userMenuAccess = pgTable("user_menu_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  menuKey: text("menu_key").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const menuAccess = pgTable("menu_access", {
  menuKey: text("menu_key").primaryKey(),
  accessLevel: text("access_level", { enum: ["owner", "admin", "staff"] })
    .notNull()
    .default("staff"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  at: timestamp("at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Suppress unused import warning for sql (kept for future raw queries)
void sql;

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type ProductionStageRow = typeof productionStages.$inferSelect;
