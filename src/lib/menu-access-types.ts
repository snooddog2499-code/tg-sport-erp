export type AccessLevel = "owner" | "admin" | "staff";

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  owner: "เจ้าของ",
  admin: "แอดมิน",
  staff: "พนักงานทั่วไป",
};

export const ACCESS_LEVEL_HINT: Record<AccessLevel, string> = {
  owner: "เฉพาะเจ้าของเท่านั้น",
  admin: "เจ้าของ + แอดมิน + ผู้จัดการ",
  staff: "เห็นได้ทุกคนที่ล็อกอิน",
};

export type MenuItem = {
  key: string;
  label: string;
  href: string;
  defaultLevel: AccessLevel;
};

export const MENU_ITEMS: MenuItem[] = [
  { key: "home", label: "แดชบอร์ด", href: "/", defaultLevel: "staff" },
  { key: "orders", label: "ออเดอร์", href: "/orders", defaultLevel: "staff" },
  { key: "production", label: "การผลิต", href: "/production", defaultLevel: "staff" },
  { key: "materials", label: "วัตถุดิบ", href: "/materials", defaultLevel: "admin" },
  { key: "dealers", label: "ตัวแทนจำหน่าย", href: "/dealers", defaultLevel: "admin" },
  { key: "attendance", label: "ลงเวลาเข้างาน", href: "/attendance", defaultLevel: "staff" },
  { key: "employees", label: "พนักงาน", href: "/employees", defaultLevel: "admin" },
  { key: "reports", label: "รายงาน", href: "/reports", defaultLevel: "owner" },
  { key: "audit", label: "ประวัติการกระทำ", href: "/audit", defaultLevel: "owner" },
];

const OWNER_ROLES = ["owner"];
const ADMIN_ROLES = ["owner", "manager", "admin"];

export function levelAllows(role: string, level: AccessLevel): boolean {
  if (level === "staff") return true;
  if (level === "admin") return ADMIN_ROLES.includes(role);
  if (level === "owner") return OWNER_ROLES.includes(role);
  return false;
}
