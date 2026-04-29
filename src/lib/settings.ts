export const settings = {
  business: {
    name: "TG Sport",
    location: "กาฬสินธุ์",
    currency: "บาท",
  },

  pricing: {
    minimumQty: 5,
    tiers: [
      { minQty: 5, discount: 0 },
      { minQty: 20, discount: 0.05 },
      { minQty: 50, discount: 0.1 },
    ],
  },

  deposit: {
    percentBeforeProduction: 50,
    percentOnDelivery: 50,
  },

  design: {
    freeRevisions: 2,
    chargePerExtraRevision: 200,
    requireCustomerApprovalBeforePrint: true,
  },

  sizes: [
    "KXS",
    "KS",
    "KM",
    "KL",
    "KXL",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "2XL",
    "3XL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
    "9XL",
    "10XL",
  ] as const,

  garmentTypes: [
    "เสื้อกีฬา",
    "เสื้อบอล",
    "เสื้อบาส",
    "เสื้อซิ่ง",
    "เสื้อโปโล",
    "เสื้อกีฬาสี",
    "เสื้อวิ่ง",
    "เสื้อองค์กร",
    "อื่น ๆ",
  ] as const,

  collarTypes: [
    "คอกลม",
    "คอวี",
    "คอวีไขว้",
    "คอห้าเหลี่ยมปิด",
    "คอห้าเหลี่ยมเปิด",
    "คอโปโล",
    "คอวีปกปิด",
    "คอวีปกเปิด",
    "คอวาย",
    "คอห้าเหลี่ยมปกปิด",
    "คอห้าเหลี่ยมปกเปิด",
    "คอปกคางหมู",
    "คอเปลือยไนกี",
  ] as const,
};

export type GarmentType = (typeof settings.garmentTypes)[number];
export type Size = (typeof settings.sizes)[number];
export type CollarType = (typeof settings.collarTypes)[number];
