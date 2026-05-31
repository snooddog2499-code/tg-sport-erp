// Standard rates for Partner-tier dealers (6 months and up). Pulled
// verbatim from the published price chart so all "Partner" dealers
// start from the same baseline. Owner can later edit individual
// prices on /dealers/[id] without touching this file.

export type PartnerRate = {
  garmentType: string;
  minQty: number;
  price: number;
};

export const PARTNER_STANDARD_RATES: PartnerRate[] = [
  // คอกลม / คอวี
  { garmentType: "คอกลม / คอวี", minQty: 10, price: 130 },
  { garmentType: "คอกลม / คอวี", minQty: 51, price: 120 },
  { garmentType: "คอกลม / คอวี", minQty: 1000, price: 100 },

  // คอปิดหน้า / คอห้าเหลี่ยม / คอวาย
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 10, price: 150 },
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 51, price: 140 },
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 1000, price: 120 },

  // คอปก / คอฟิก / คอปกวินเทจ
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 10, price: 180 },
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 51, price: 170 },
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 1000, price: 160 },

  // กางเกงพิมพ์ลาย
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 10, price: 100 },
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 51, price: 90 },
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 1000, price: 80 },
];

// Add-ons mentioned in the chart. These aren't auto-applied to the
// price table (they are charged per-item per-order), but kept here as
// a single source of truth for documentation + future automation.
export const PARTNER_ADDON_NOTES = [
  "แขนยาว — เพิ่มตัวละ 30 บาท",
  "แขนกุด — เพิ่มตัวละ 20 บาท",
  "ไซส์ 3XL ขึ้นไป — เพิ่มตัวละ 30 บาท",
] as const;

// Defaults applied at the dealer header when ticking "ใช้เรทมาตรฐาน Partner"
export const PARTNER_DEFAULTS = {
  discountPct: 10, // standard partner-level discount (matches existing form default)
  commissionPct: 5, // standard partner-level commission
} as const;
