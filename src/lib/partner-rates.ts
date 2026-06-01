// Standard rate cards for Partner-tier dealers. TG Sport publishes
// two tiers depending on how long the partner has been signed up;
// each tier offers a different price per quantity range. Owner can
// later edit individual prices on /dealers/[id] without touching
// this file.

export type PartnerRate = {
  garmentType: string;
  minQty: number;
  price: number;
};

export type PartnerTierKey = "p1_6" | "p6_plus";

// Tier: Partner 1-6 เดือน (introductory rate)
export const PARTNER_RATES_1_TO_6_MONTHS: PartnerRate[] = [
  // คอกลม / คอวี
  { garmentType: "คอกลม / คอวี", minQty: 10, price: 140 },
  { garmentType: "คอกลม / คอวี", minQty: 51, price: 130 },
  { garmentType: "คอกลม / คอวี", minQty: 1000, price: 110 },

  // คอปิดหน้า / คอห้าเหลี่ยม / คอวาย
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 10, price: 160 },
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 51, price: 150 },
  { garmentType: "คอปิดหน้า / คอห้าเหลี่ยม / คอวาย", minQty: 1000, price: 130 },

  // คอปก / คอฟิก / คอปกวินเทจ
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 10, price: 190 },
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 51, price: 180 },
  { garmentType: "คอปก / คอฟิก / คอปกวินเทจ", minQty: 1000, price: 170 },

  // กางเกงพิมพ์ลาย
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 10, price: 110 },
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 51, price: 100 },
  { garmentType: "กางเกงพิมพ์ลาย", minQty: 1000, price: 90 },
];

// Tier: Partner 6 เดือนขึ้นไป (loyalty rate — cheaper)
export const PARTNER_RATES_6_MONTHS_PLUS: PartnerRate[] = [
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

export const PARTNER_TIERS: Array<{
  key: PartnerTierKey;
  label: string;
  shortLabel: string;
  rates: PartnerRate[];
}> = [
  {
    key: "p1_6",
    label: "Partner 1-6 เดือน",
    shortLabel: "1-6 เดือน",
    rates: PARTNER_RATES_1_TO_6_MONTHS,
  },
  {
    key: "p6_plus",
    label: "Partner 6 เดือนขึ้นไป",
    shortLabel: "6 เดือนขึ้นไป",
    rates: PARTNER_RATES_6_MONTHS_PLUS,
  },
];

export function ratesForTier(key: PartnerTierKey): PartnerRate[] {
  return PARTNER_TIERS.find((t) => t.key === key)?.rates ?? [];
}

// Backwards-compatible alias for existing imports — points to the
// loyalty (6-month+) tier which was the original default.
export const PARTNER_STANDARD_RATES = PARTNER_RATES_6_MONTHS_PLUS;

// Add-ons mentioned on the chart. Same for both tiers — not auto-applied
// to dealer_prices since they're per-item per-order surcharges.
export const PARTNER_ADDON_NOTES = [
  "แขนยาว — เพิ่มตัวละ 30 บาท",
  "แขนกุด — เพิ่มตัวละ 20 บาท",
  "ไซส์ 3XL ขึ้นไป — เพิ่มตัวละ 30 บาท",
] as const;

// Header-level defaults applied when seeding any partner tier
export const PARTNER_DEFAULTS = {
  discountPct: 10,
  commissionPct: 5,
} as const;
