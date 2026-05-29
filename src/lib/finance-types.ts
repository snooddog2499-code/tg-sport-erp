// Pure types/constants — safe to import from client and server.

export type TxnType = "income" | "expense";

export const TXN_TYPE_LABELS: Record<TxnType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
};

export const INCOME_CATEGORIES = [
  "ขายสินค้า (ไม่ผูกออเดอร์)",
  "ค่ามัดจำ",
  "เช่าพื้นที่",
  "ดอกเบี้ย",
  "เงินคืน",
  "อื่นๆ",
] as const;

export const EXPENSE_CATEGORIES = [
  "วัตถุดิบ",
  "ค่าจ้าง / เงินเดือน",
  "ค่าน้ำค่าไฟ",
  "ค่าขนส่ง",
  "ค่าซ่อม / บำรุง",
  "ค่าเช่า",
  "ค่าโฆษณา",
  "ค่าน้ำมัน",
  "ค่าธรรมเนียม",
  "อื่นๆ",
] as const;

export function categoriesFor(type: TxnType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
