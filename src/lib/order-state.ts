export const ORDER_STATUSES = [
  "received",
  "quoted",
  "approved",
  "in_production",
  "qc",
  "ready",
  "delivered",
  "paid",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ["quoted", "approved", "cancelled"],
  quoted: ["approved", "cancelled", "received"],
  approved: ["in_production", "cancelled"],
  in_production: ["qc", "cancelled"],
  qc: ["ready", "in_production"],
  ready: ["delivered"],
  delivered: ["paid"],
  paid: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNext(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}
