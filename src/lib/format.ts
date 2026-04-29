export function formatBaht(n: number | null | undefined): string {
  const v = n ?? 0;
  return v.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
}

export function formatDateTH(s: string | null | undefined): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const statusLabels = {
  received: "รับออเดอร์",
  quoted: "เสนอราคา",
  approved: "อนุมัติ",
  in_production: "กำลังผลิต",
  qc: "QC",
  ready: "พร้อมส่ง",
  delivered: "ส่งแล้ว",
  paid: "จ่ายครบ",
  cancelled: "ยกเลิก",
} as const;

export const statusColors: Record<string, string> = {
  received: "bg-zinc-100 text-zinc-700",
  quoted: "bg-sky-100 text-sky-700",
  approved: "bg-indigo-100 text-indigo-700",
  in_production: "bg-amber-100 text-amber-800",
  qc: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  delivered: "bg-emerald-100 text-emerald-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export const stageLabels = {
  graphic: "กราฟฟิก",
  print: "สั่งพิมพ์",
  roll: "รีดโรล",
  laser: "ตัดเลเซอร์",
  sew: "เย็บ",
  qc: "รีดและ QC",
  pack: "พับแพ็ค",
  ship: "จัดส่ง",
} as const;

export const stageEmoji = {
  graphic: "🎨",
  print: "🖨️",
  roll: "🔥",
  laser: "✂️",
  sew: "🧵",
  qc: "✅",
  pack: "📦",
  ship: "🚚",
} as const;
