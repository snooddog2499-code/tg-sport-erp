# Business Rules — Default Assumptions

ผมตั้ง default ไว้ตามด้านล่าง **คุณสามารถเปลี่ยนได้ภายหลัง** โดยแก้ไฟล์ `src/lib/settings.ts` หรือผ่านหน้า Settings ในเว็บ (Phase 2+)

## ราคา

```ts
pricing: {
  minimumQty: 5,
  tiers: [
    { minQty: 5,  discount: 0 },    // 5-19 ตัว: ราคาเต็ม
    { minQty: 20, discount: 0.05 }, // 20-49: ลด 5%
    { minQty: 50, discount: 0.10 }, // 50+: ลด 10%
  ],
}
```

## มัดจำ

```ts
deposit: {
  percentBeforeProduction: 50,    // มัดจำ 50% ก่อนเข้าสาย
  percentOnDelivery: 50,          // ที่เหลือ 50% เมื่อส่ง
}
```

## งานออกแบบ

```ts
design: {
  freeRevisions: 2,
  chargePerExtraRevision: 200,    // บาท
  requireCustomerApprovalBeforePrint: true,  // บังคับเสมอ
}
```

## Order code format

```
TGS-YYMM-NNNN
TGS-2604-0001 = ออเดอร์แรกของเดือน เม.ย. 2026
```

## Status

- รับออเดอร์ใหม่ → `received`
- เสนอราคาแล้ว → `quoted`
- ลูกค้า approve + มัดจำ → `approved` → เข้า production
