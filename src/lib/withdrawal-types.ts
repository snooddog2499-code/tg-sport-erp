// Pure types/constants module — safe to import from both server actions and client components

export const DEPT_VALUES = [
  "graphic",
  "print",
  "roll",
  "laser",
  "sew",
  "qc",
  "admin",
  "other",
] as const;

export type WithdrawalDept = (typeof DEPT_VALUES)[number];

export const DEPT_LABELS: Record<WithdrawalDept, string> = {
  graphic: "กราฟฟิก",
  print: "ช่างพิมพ์",
  roll: "ช่างรีดโรล",
  laser: "ช่างเลเซอร์",
  sew: "ช่างเย็บ",
  qc: "QC",
  admin: "แอดมิน/ออฟฟิศ",
  other: "อื่นๆ",
};

// Map user.role -> default dept (auto-fill for workers)
export const ROLE_TO_DEPT: Record<string, WithdrawalDept> = {
  graphic: "graphic",
  print: "print",
  roll: "roll",
  laser: "laser",
  sew: "sew",
  qc: "qc",
  admin: "admin",
  manager: "admin",
  owner: "admin",
};
