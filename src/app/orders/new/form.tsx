"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createOrder, type OrderFormState } from "@/actions/orders";
import { settings } from "@/lib/settings";

type CustomerOption = {
  id: number;
  name: string;
  tier: string;
  freeShipping: boolean;
  defaultDiscountPct: number;
};
type DealerOption = {
  id: number;
  name: string;
  discountPct: number;
  commissionPct: number;
};
type DealerPrice = {
  dealerId: number;
  garmentType: string;
  minQty: number;
  price: number;
};
type GraphicUser = { id: number; name: string };

const initialState: OrderFormState = {};

function pickDealerPrice(
  prices: DealerPrice[],
  dealerId: number | null,
  garment: string,
  qty: number
): number | null {
  if (!dealerId || !garment) return null;
  const matches = prices
    .filter((p) => p.dealerId === dealerId && p.garmentType === garment)
    .filter((p) => qty >= p.minQty)
    .sort((a, b) => b.minQty - a.minQty);
  return matches[0]?.price ?? null;
}

export default function NewOrderForm({
  customers,
  dealers,
  isDealer,
  dealerPrices,
  currentDealerId,
  graphicUsers,
}: {
  customers: CustomerOption[];
  dealers: DealerOption[];
  isDealer: boolean;
  dealerPrices: DealerPrice[];
  currentDealerId: number | null;
  graphicUsers: GraphicUser[];
}) {
  const [state, formAction, pending] = useActionState(
    createOrder,
    initialState
  );
  const [dealerId, setDealerId] = useState<number | null>(
    isDealer ? currentDealerId : null
  );
  const [garmentType, setGarmentType] = useState("");
  const [qty, setQty] = useState<string>(String(settings.pricing.minimumQty));
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [requiresDeposit, setRequiresDeposit] = useState(true);
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const [sizes, setSizes] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.sizes.map((s) => [s, ""]))
  );

  const sizeTotal = Object.values(sizes).reduce(
    (acc, v) => acc + (parseInt(v, 10) || 0),
    0
  );

  const sizeBreakdownJson = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const [k, v] of Object.entries(sizes)) {
      const n = parseInt(v, 10) || 0;
      if (n > 0) obj[k] = n;
    }
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : "";
  }, [sizes]);

  const matchedCustomer = customers.find(
    (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
  );
  const customerStatus: "matched" | "new" | "empty" = customerName.trim()
    ? matchedCustomer
      ? "matched"
      : "new"
    : "empty";

  const qtyNum = parseInt(qty, 10) || 0;
  const unitPriceNum = parseFloat(unitPrice) || 0;

  const autoPrice = useMemo(
    () => pickDealerPrice(dealerPrices, dealerId, garmentType, qtyNum),
    [dealerPrices, dealerId, garmentType, qtyNum]
  );

  const subtotal = qtyNum * unitPriceNum;
  const BIG_SIZES_SET = ["3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
  const BIG_SIZE_FEE = 30;
  const bigSizeQty = Object.entries(sizes).reduce((acc, [k, v]) => {
    if (BIG_SIZES_SET.includes(k)) {
      return acc + (parseInt(v, 10) || 0);
    }
    return acc;
  }, 0);
  const sizeSurcharge = bigSizeQty * BIG_SIZE_FEE;

  // Auto-apply customer promo (free shipping + percentage discount) when matched
  const promoSubtotalRef = useRef(subtotal);
  useEffect(() => {
    if (matchedCustomer && subtotal > 0) {
      const promoDiscount =
        (subtotal * (matchedCustomer.defaultDiscountPct ?? 0)) / 100;
      if (promoDiscount > 0) {
        const current = parseFloat(discount) || 0;
        if (
          current === 0 ||
          // re-apply if subtotal changed and old discount looks auto-set
          Math.abs(
            current -
              (promoSubtotalRef.current *
                (matchedCustomer.defaultDiscountPct ?? 0)) /
                100
          ) < 0.5
        ) {
          setDiscount(promoDiscount.toFixed(2));
        }
      }
      if (matchedCustomer.freeShipping) {
        setShipping("0");
      }
    }
    promoSubtotalRef.current = subtotal;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCustomer?.id, subtotal]);

  const dealerInfo = dealerId
    ? dealers.find((d) => d.id === dealerId)
    : undefined;
  const subtotalWithSurcharge = subtotal + sizeSurcharge;
  const dealerDiscountAmt = dealerInfo
    ? subtotalWithSurcharge * (dealerInfo.discountPct / 100)
    : 0;
  const discountAmt = Math.max(0, parseFloat(discount) || 0);
  const shippingAmt = Math.max(0, parseFloat(shipping) || 0);
  const taxable = Math.max(
    0,
    subtotalWithSurcharge - dealerDiscountAmt - discountAmt + shippingAmt
  );
  const vatRate = vatEnabled ? 0.07 : 0;
  const vatAmt = taxable * vatRate;
  const grandTotal = taxable + vatAmt;

  return (
    <form
      action={formAction}
      className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5"
    >
      <Field label="ลูกค้า" required error={state.errors?.customerName}>
        <input
          name="customerName"
          list="customers-datalist"
          required
          autoComplete="off"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="input"
          placeholder="พิมพ์ชื่อลูกค้า — เลือกจากที่มีอยู่ หรือพิมพ์ชื่อใหม่"
        />
        <datalist id="customers-datalist">
          {customers.map((c) => (
            <option
              key={c.id}
              value={c.name}
              label={c.tier === "vip" ? "⭐ VIP" : c.tier === "regular" ? "ประจำ" : "ใหม่"}
            />
          ))}
        </datalist>
        <input
          type="hidden"
          name="customerId"
          value={matchedCustomer?.id ?? ""}
        />
        {customerStatus === "matched" && (
          <div className="text-[11px] text-emerald-600 mt-1 space-y-0.5">
            <p>✓ ใช้ลูกค้าเดิม: {matchedCustomer!.name}</p>
            {(matchedCustomer!.freeShipping ||
              (matchedCustomer!.defaultDiscountPct ?? 0) > 0) && (
              <p className="text-emerald-700 font-medium">
                🎁 โปรโมชั่นสมาชิก:
                {matchedCustomer!.freeShipping ? " ส่งฟรี" : ""}
                {(matchedCustomer!.defaultDiscountPct ?? 0) > 0
                  ? ` ส่วนลด ${matchedCustomer!.defaultDiscountPct}%`
                  : ""}{" "}
                — ระบบเติมให้อัตโนมัติแล้ว
              </p>
            )}
          </div>
        )}
        {customerStatus === "new" && (
          <p className="text-[11px] text-brand-600 mt-1">
            + ลูกค้าใหม่ &mdash; ระบบจะเพิ่ม &quot;{customerName.trim()}&quot;
            ให้อัตโนมัติเมื่อบันทึกออเดอร์
          </p>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="ประเภทเสื้อ" required error={state.errors?.garmentType}>
          <select
            name="garmentType"
            required
            value={garmentType}
            onChange={(e) => setGarmentType(e.target.value)}
            className="input"
          >
            <option value="" disabled>
              -- เลือก --
            </option>
            {settings.garmentTypes.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <Field label="แบบคอเสื้อ" error={state.errors?.collar}>
          <select name="collar" defaultValue="" className="input">
            <option value="">— ยังไม่ระบุ —</option>
            {settings.collarTypes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="จำนวนรวม (ตัว)" required error={state.errors?.qty}>
          <input
            name="qty"
            type="number"
            min={settings.pricing.minimumQty}
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input"
          />
          {sizeTotal > 0 && (
            <p
              className={`text-[11px] mt-1 ${
                sizeTotal === (parseInt(qty, 10) || 0)
                  ? "text-emerald-600"
                  : "text-amber-700"
              }`}
            >
              {sizeTotal === (parseInt(qty, 10) || 0) ? "✓" : "⚠"} ผลรวมไซส์ ={" "}
              {sizeTotal} ตัว
              {sizeTotal !== (parseInt(qty, 10) || 0) && (
                <button
                  type="button"
                  onClick={() => setQty(String(sizeTotal))}
                  className="ml-2 text-brand-600 hover:underline"
                >
                  ใช้ค่านี้
                </button>
              )}
            </p>
          )}
        </Field>
      </div>

      <Field label="แยกไซส์ (ไม่บังคับ — ไซส์ 3XL ขึ้นไปบวก ฿30/ตัว)">
        <input type="hidden" name="sizeBreakdownJson" value={sizeBreakdownJson} />
        <SizeGrid label="เด็ก">
          {settings.sizes
            .filter((s) => s.startsWith("K"))
            .map((s) => (
              <SizeInput
                key={s}
                size={s}
                value={sizes[s]}
                onChange={(v) =>
                  setSizes((prev) => ({ ...prev, [s]: v }))
                }
              />
            ))}
        </SizeGrid>
        <SizeGrid label="ผู้ใหญ่">
          {settings.sizes
            .filter((s) => !s.startsWith("K"))
            .map((s) => (
              <SizeInput
                key={s}
                size={s}
                value={sizes[s]}
                onChange={(v) =>
                  setSizes((prev) => ({ ...prev, [s]: v }))
                }
              />
            ))}
        </SizeGrid>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="ราคา/ตัว (บาท)" error={state.errors?.unitPrice}>
          <div>
            <input
              name="unitPrice"
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="input"
              placeholder="ใส่ 0 ถ้ายังไม่ตกลง"
            />
            {autoPrice !== null && autoPrice !== unitPriceNum && (
              <button
                type="button"
                onClick={() => setUnitPrice(String(autoPrice))}
                className="text-[11px] text-brand-600 hover:underline mt-1"
              >
                ใช้ราคาตัวแทน ฿{autoPrice.toLocaleString("th-TH")} / ตัว
              </button>
            )}
            {autoPrice !== null && autoPrice === unitPriceNum && (
              <p className="text-[11px] text-emerald-600 mt-1">
                ✓ ใช้ราคาตัวแทน ฿{autoPrice.toLocaleString("th-TH")}
              </p>
            )}
          </div>
        </Field>
        <Field label="วันที่ต้องการรับของ" error={state.errors?.deadline}>
          <input name="deadline" type="date" className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="ส่วนลด (บาท)">
          <input
            name="discount"
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="input"
            placeholder="0"
          />
        </Field>
        <Field label="ค่าขนส่ง (บาท)">
          <input
            name="shipping"
            type="number"
            min={0}
            step="0.01"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            className="input"
            placeholder="0"
          />
        </Field>
        <Field label="ภาษีมูลค่าเพิ่ม">
          <label className="flex items-center gap-2 input cursor-pointer">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm">คิด VAT 7%</span>
          </label>
          <input
            type="hidden"
            name="vatRate"
            value={vatEnabled ? "0.07" : "0"}
          />
        </Field>
      </div>

      {subtotal > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 text-sm">
          <p className="text-xs font-medium text-zinc-500 mb-2">สรุปยอด</p>
          <dl className="space-y-1">
            <Row dt="ยอดสินค้า" dd={fmt(subtotal)} />
            {sizeSurcharge > 0 && (
              <Row
                dt={`เพิ่มไซส์ใหญ่ (${bigSizeQty} ตัว × ${BIG_SIZE_FEE})`}
                dd={`+ ${fmt(sizeSurcharge)}`}
                tone="text-amber-700"
              />
            )}
            {dealerDiscountAmt > 0 && (
              <Row
                dt={`ส่วนลดตัวแทน (${dealerInfo?.discountPct}%)`}
                dd={`− ${fmt(dealerDiscountAmt)}`}
                tone="text-zinc-600"
              />
            )}
            {discountAmt > 0 && (
              <Row
                dt="ส่วนลด"
                dd={`− ${fmt(discountAmt)}`}
                tone="text-zinc-600"
              />
            )}
            {shippingAmt > 0 && (
              <Row dt="ค่าขนส่ง" dd={`+ ${fmt(shippingAmt)}`} />
            )}
            {vatEnabled && (
              <Row dt="VAT 7%" dd={`+ ${fmt(vatAmt)}`} />
            )}
            <div className="border-t border-zinc-200 mt-2 pt-2">
              <Row
                dt={<span className="font-semibold">ยอดสุทธิ</span>}
                dd={
                  <span className="font-bold text-base text-brand-600">
                    {fmt(grandTotal)}
                  </span>
                }
              />
            </div>
            <div className="border-t border-dashed border-zinc-300 mt-2 pt-2">
              <div className="flex items-center gap-3 mb-2 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="requiresDeposit"
                    value="on"
                    checked={requiresDeposit}
                    onChange={() => setRequiresDeposit(true)}
                    className="accent-brand-500"
                  />
                  <span>มัดจำ 50% ก่อนผลิต</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="requiresDeposit"
                    value="off"
                    checked={!requiresDeposit}
                    onChange={() => setRequiresDeposit(false)}
                    className="accent-brand-500"
                  />
                  <span>ไม่มัดจำ (จ่ายเต็มเมื่อรับของ)</span>
                </label>
              </div>
              {requiresDeposit ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="text-[11px] text-amber-800 font-medium">
                      มัดจำ 50% (ก่อนเริ่มผลิต)
                    </p>
                    <p className="text-base font-bold text-amber-900 tabular-nums">
                      {fmt(grandTotal * 0.5)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                    <p className="text-[11px] text-emerald-800 font-medium">
                      ส่วนที่เหลือ (รับสินค้า)
                    </p>
                    <p className="text-base font-bold text-emerald-900 tabular-nums">
                      {fmt(grandTotal - grandTotal * 0.5)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                  <p className="text-[11px] text-emerald-800 font-medium">
                    ชำระเต็มจำนวนเมื่อรับสินค้า
                  </p>
                  <p className="text-base font-bold text-emerald-900 tabular-nums">
                    {fmt(grandTotal)}
                  </p>
                </div>
              )}
            </div>
          </dl>
        </div>
      )}

      {!isDealer && dealers.length > 0 && (
        <Field label="ตัวแทนจำหน่าย (ถ้ามี)">
          <select
            name="dealerId"
            value={dealerId ?? ""}
            onChange={(e) =>
              setDealerId(e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className="input"
          >
            <option value="">— ไม่ผ่านตัวแทน —</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} (ส่วนลด {d.discountPct}%, commission {d.commissionPct}%)
              </option>
            ))}
          </select>
        </Field>
      )}

      {graphicUsers.length > 0 && (
        <Field label="กราฟฟิกผู้รับผิดชอบ">
          <select
            name="assignedGraphicId"
            defaultValue=""
            className="input"
          >
            <option value="">— ยังไม่มอบหมาย —</option>
            {graphicUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">
            ระบบจะมอบหมายสเตจกราฟฟิกให้คนนี้อัตโนมัติเมื่อเริ่มผลิต
          </p>
        </Field>
      )}

      <Field label="หมายเหตุ / รายละเอียด" error={state.errors?.notes}>
        <textarea
          name="notes"
          rows={4}
          className="input"
          placeholder="สี, ลาย, เบอร์หลัง, ไซส์, อื่น ๆ"
        />
      </Field>

      <Field label="ไฟล์แนบ (รูปอ้างอิง, โลโก้, PDF) — ไม่บังคับ">
        <input
          name="attachments"
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="block w-full text-sm text-zinc-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 file:cursor-pointer"
        />
        <p className="text-[11px] text-zinc-500 mt-1">
          เลือกได้หลายไฟล์ · สูงสุด 20 MB/ไฟล์ · รองรับรูปภาพ, PDF, Word, Excel
        </p>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || customerStatus === "empty"}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-md font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : "บันทึกออเดอร์"}
        </button>
        <Link
          href="/orders"
          className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-md"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error?.map((msg, i) => (
        <p key={i} className="text-xs text-red-600 mt-1">
          {msg}
        </p>
      ))}
    </label>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Row({
  dt,
  dd,
  tone,
}: {
  dt: React.ReactNode;
  dd: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`flex justify-between text-sm ${tone ?? ""}`}>
      <dt>{dt}</dt>
      <dd className="tabular-nums">{dd}</dd>
    </div>
  );
}

function SizeGrid({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="text-[11px] font-medium text-zinc-500 mb-1.5">{label}</p>
      <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-1.5">
        {children}
      </div>
    </div>
  );
}

function SizeInput({
  size,
  value,
  onChange,
}: {
  size: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-center">
      <span className="text-[10px] font-medium text-zinc-600 block leading-tight">
        {size}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-center text-sm px-1"
        placeholder="0"
      />
    </label>
  );
}
