export const VAT_RATE_DEFAULT = 0.07;

export const BIG_SIZE_SURCHARGE = 30;
export const BIG_SIZES: ReadonlyArray<string> = [
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
  "9XL",
  "10XL",
];

export function bigSizeQtyFromBreakdown(
  sizeBreakdownJson: string | null | undefined
): number {
  if (!sizeBreakdownJson) return 0;
  try {
    const obj = JSON.parse(sizeBreakdownJson) as Record<string, number>;
    let qty = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (BIG_SIZES.includes(k)) qty += Number(v) || 0;
    }
    return qty;
  } catch {
    return 0;
  }
}

export function computeItemSubtotal(
  qty: number,
  unitPrice: number,
  sizeBreakdownJson: string | null | undefined
): { base: number; surcharge: number; total: number } {
  const base = qty * unitPrice;
  const bigQty = bigSizeQtyFromBreakdown(sizeBreakdownJson);
  const surcharge = bigQty * BIG_SIZE_SURCHARGE;
  return { base, surcharge, total: base + surcharge };
}

export type OrderTotals = {
  subtotal: number;
  sizeSurcharge: number;
  dealerDiscount: number;
  discount: number;
  shipping: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  dealerCommission: number;
};

export type ComputeInput = {
  subtotal: number;
  sizeSurcharge?: number;
  dealerDiscountPct?: number;
  dealerCommissionPct?: number;
  discount?: number;
  shipping?: number;
  vatRate?: number;
};

export function computeOrderTotals(input: ComputeInput): OrderTotals {
  const baseSubtotal = Math.max(0, input.subtotal);
  const sizeSurcharge = Math.max(0, input.sizeSurcharge ?? 0);
  const subtotal = baseSubtotal + sizeSurcharge;
  const dealerDiscount =
    input.dealerDiscountPct && input.dealerDiscountPct > 0
      ? round2(subtotal * (input.dealerDiscountPct / 100))
      : 0;

  const afterDealer = Math.max(0, subtotal - dealerDiscount);
  const discount = Math.max(0, Math.min(input.discount ?? 0, afterDealer));
  const shipping = Math.max(0, input.shipping ?? 0);

  const taxable = Math.max(0, afterDealer - discount + shipping);
  const vatRate = input.vatRate ?? 0;
  const vatAmount = vatRate > 0 ? round2(taxable * vatRate) : 0;
  const total = round2(taxable + vatAmount);

  const dealerCommission =
    input.dealerCommissionPct && input.dealerCommissionPct > 0
      ? round2(total * (input.dealerCommissionPct / 100))
      : 0;

  return {
    subtotal: round2(baseSubtotal),
    sizeSurcharge: round2(sizeSurcharge),
    dealerDiscount,
    discount: round2(discount),
    shipping: round2(shipping),
    vatRate,
    vatAmount,
    total,
    dealerCommission,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
