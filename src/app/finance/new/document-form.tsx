"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createFinanceDocument,
  type FinanceDocFormState,
} from "@/actions/finance-documents";
import AttachmentUploader from "@/components/AttachmentUploader";
import {
  Plus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Save,
  X,
} from "lucide-react";

const initial: FinanceDocFormState = {};

type Line = {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function addDays(ymd: string, days: number): string {
  if (!ymd || isNaN(days)) return ymd;
  const d = new Date(ymd + "T00:00:00");
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const VAT_RATE = 0.07;

const fmt = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function DocumentForm() {
  const [state, action, pending] = useActionState(
    createFinanceDocument,
    initial
  );

  const [type, setType] = useState<"income" | "expense">("expense");
  const [docDate, setDocDate] = useState(todayYmd());
  const [creditDays, setCreditDays] = useState("0");
  const [priceIncludesVat, setPriceIncludesVat] = useState(false);
  const [discountPct, setDiscountPct] = useState("0");
  const [vatEnabled, setVatEnabled] = useState(false);
  const [whtEnabled, setWhtEnabled] = useState(false);
  const [whtPct, setWhtPct] = useState("3");

  const [lines, setLines] = useState<Line[]>([
    { id: uid(), description: "", qty: "1", unitPrice: "" },
  ]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: uid(), description: "", qty: "1", unitPrice: "" },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function updateLine(id: string, field: keyof Line, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  const dueDate = useMemo(
    () => addDays(docDate, Number(creditDays) || 0),
    [docDate, creditDays]
  );

  // Live totals
  const totals = useMemo(() => {
    const lineTotals = lines.map((l) => {
      const q = Number(l.qty) || 0;
      const p = Number(l.unitPrice) || 0;
      return q * p;
    });
    const rawTotal = lineTotals.reduce((s, t) => s + t, 0);
    let subtotal = rawTotal;
    if (vatEnabled && priceIncludesVat) {
      subtotal = rawTotal / (1 + VAT_RATE);
    }
    const dPct = Number(discountPct) || 0;
    const discountAmount = (subtotal * dPct) / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatEnabled ? afterDiscount * VAT_RATE : 0;
    const wPct = Number(whtPct) || 0;
    const whtAmount = whtEnabled ? (afterDiscount * wPct) / 100 : 0;
    const grandTotal = afterDiscount + vatAmount - whtAmount;
    return {
      lineTotals,
      subtotal,
      discountAmount,
      afterDiscount,
      vatAmount,
      whtAmount,
      grandTotal,
    };
  }, [lines, vatEnabled, priceIncludesVat, discountPct, whtEnabled, whtPct]);

  const isIncome = type === "income";

  return (
    <form action={action} className="space-y-6">
      {/* Type pill */}
      <div className="card p-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-zinc-500">เลือกประเภทเอกสาร</p>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/50 p-0.5 mt-1.5">
            {(["expense", "income"] as const).map((t) => {
              const active = type === t;
              const Icon = t === "income" ? ArrowUpCircle : ArrowDownCircle;
              const tone =
                t === "income" ? "text-emerald-700" : "text-rose-700";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? `bg-white ${tone} shadow-sm border border-zinc-200`
                      : "text-zinc-600 hover:text-ink-900"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.25} />
                  {t === "income" ? "รายรับ" : "รายจ่าย"}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="type" value={type} />
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">จำนวนเงินรวมทั้งสิ้น</p>
          <p
            className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${
              isIncome ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {fmt(totals.grandTotal)}
          </p>
          <p className="text-[10px] text-zinc-400">บาท</p>
        </div>
      </div>

      {/* Vendor info */}
      <section className="card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">
          {isIncome ? "ข้อมูลผู้ชำระเงิน / ลูกค้า" : "ข้อมูลผู้จำหน่าย"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ชื่อ <span className="text-red-500">*</span>
            </label>
            <input
              name="vendorName"
              type="text"
              required
              className="input"
              placeholder={
                isIncome ? "เช่น ลูกค้าหน้าร้าน / บริษัท XYZ" : "เช่น ร้านวัสดุ ABC"
              }
            />
            {state.errors?.vendorName && (
              <p className="text-xs text-red-600 mt-1">
                {state.errors.vendorName[0]}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ที่อยู่
            </label>
            <textarea
              name="vendorAddress"
              rows={2}
              className="input"
              placeholder="ที่อยู่บนใบเสร็จ / ใบกำกับภาษี (ไม่บังคับ)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              เลขประจำตัวผู้เสียภาษี
            </label>
            <input
              name="vendorTaxId"
              type="text"
              className="input"
              placeholder="0-0000-00000-00-0"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              สำนักงาน / สาขา
            </label>
            <input
              name="vendorBranch"
              type="text"
              className="input"
              placeholder="สำนักงานใหญ่ / สาขาที่ ..."
            />
          </div>
        </div>
      </section>

      {/* Dates + reference */}
      <section className="card p-4 md:p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">
          วันที่และเลขที่อ้างอิง
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              วันที่ <span className="text-red-500">*</span>
            </label>
            <input
              name="docDate"
              type="date"
              required
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              เครดิต (วัน)
            </label>
            <input
              name="creditDays"
              type="number"
              min="0"
              value={creditDays}
              onChange={(e) => setCreditDays(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ครบกำหนด
            </label>
            <input
              type="date"
              value={dueDate}
              readOnly
              disabled
              className="input bg-zinc-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              เลขที่อ้างอิง
            </label>
            <input
              name="referenceNo"
              type="text"
              className="input"
              placeholder="เลขใบกำกับ/ใบเสร็จของฝั่งตรงข้าม"
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ราคาสินค้า
            </label>
            <select
              value={priceIncludesVat ? "true" : "false"}
              onChange={(e) => setPriceIncludesVat(e.target.value === "true")}
              className="input"
            >
              <option value="false">ราคาไม่รวมภาษี</option>
              <option value="true">ราคารวมภาษีแล้ว</option>
            </select>
            <input
              type="hidden"
              name="priceIncludesVat"
              value={priceIncludesVat ? "true" : "false"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              รายละเอียด (สรุปบนหัวเอกสาร)
            </label>
            <input
              name="description"
              type="text"
              className="input"
              placeholder="เช่น ซื้อวัตถุดิบเดือน พ.ค."
            />
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="card overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">รายการ</h2>
          <button
            type="button"
            onClick={addLine}
            className="btn btn-outline btn-xs"
          >
            <Plus size={13} strokeWidth={2.5} />
            เพิ่มแถว
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium w-10">#</th>
                <th className="text-left px-3 py-2.5 font-medium">รายละเอียด</th>
                <th className="text-right px-3 py-2.5 font-medium w-24">
                  จำนวน
                </th>
                <th className="text-right px-3 py-2.5 font-medium w-32">
                  ราคา/หน่วย
                </th>
                <th className="text-right px-3 py-2.5 font-medium w-32">
                  ราคารวม
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      name="lineDescription"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.id, "description", e.target.value)
                      }
                      className="input"
                      placeholder="รายละเอียด"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      name="lineQty"
                      step="0.01"
                      min="0"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(line.id, "qty", e.target.value)
                      }
                      className="input text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      name="lineUnitPrice"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.id, "unitPrice", e.target.value)
                      }
                      className="input text-right"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-900">
                    {fmt(totals.lineTotals[idx] ?? 0)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 1}
                      className="text-zinc-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-zinc-400 p-1"
                      title="ลบรายการนี้"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {state.errors?.lines && (
          <div className="px-4 py-2 bg-red-50 text-xs text-red-700 border-t border-red-200">
            {state.errors.lines[0]}
          </div>
        )}
      </section>

      {/* Notes + Summary side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <section className="card p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-900">หมายเหตุ</h2>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              หมายเหตุ (แสดงในเอกสาร)
            </label>
            <textarea
              name="notes"
              rows={3}
              className="input"
              placeholder="เช่น เงื่อนไขการจ่าย / ข้อตกลงพิเศษ"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              โน้ตภายในบริษัท (ไม่แสดงในเอกสาร)
            </label>
            <textarea
              name="internalNotes"
              rows={3}
              className="input"
              placeholder="บันทึกสำหรับใช้ภายในเท่านั้น"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ไฟล์แนบ (ใบเสร็จ / ใบกำกับ — รองรับ PDF, รูป)
            </label>
            <AttachmentUploader name="attachment" />
          </div>
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">
            สรุปยอด
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">รวมเป็นเงิน</span>
              <span className="tabular-nums font-medium text-ink-900">
                {fmt(totals.subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">ส่วนลด (%)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="discountPct"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="input text-right tabular-nums"
                  style={{ width: 80 }}
                />
                <span className="tabular-nums text-zinc-600 w-20 text-right">
                  −{fmt(totals.discountAmount)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <span className="text-zinc-600">ราคาหลังหักส่วนลด</span>
              <span className="tabular-nums font-medium text-ink-900">
                {fmt(totals.afterDiscount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-zinc-600 inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                ภาษีมูลค่าเพิ่ม 7%
                <input
                  type="hidden"
                  name="vatEnabled"
                  value={vatEnabled ? "true" : "false"}
                />
              </label>
              <span className="tabular-nums text-zinc-600">
                +{fmt(totals.vatAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-zinc-600 inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whtEnabled}
                  onChange={(e) => setWhtEnabled(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                หักภาษี ณ ที่จ่าย
                {whtEnabled && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    value={whtPct}
                    onChange={(e) => setWhtPct(e.target.value)}
                    onClick={(e) => e.preventDefault()}
                    className="input text-right tabular-nums ml-1"
                    style={{ width: 60 }}
                  />
                )}
                {whtEnabled && <span className="text-xs">%</span>}
                <input
                  type="hidden"
                  name="withholdingEnabled"
                  value={whtEnabled ? "true" : "false"}
                />
                <input type="hidden" name="withholdingPct" value={whtPct} />
              </label>
              <span className="tabular-nums text-zinc-600">
                −{fmt(totals.whtAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t-2 border-zinc-200">
              <span className="font-semibold text-ink-900">
                จำนวนเงินรวมทั้งสิ้น
              </span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  isIncome ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {fmt(totals.grandTotal)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {state.message && !state.success && (
        <div className="text-sm rounded-md px-4 py-3 text-red-700 bg-red-50 border border-red-200">
          {state.message}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn btn-brand">
          <Save size={14} strokeWidth={2.5} />
          {pending ? "กำลังบันทึก..." : "บันทึกเอกสาร"}
        </button>
        <a href="/finance" className="btn btn-outline">
          <X size={14} />
          ยกเลิก
        </a>
      </div>
    </form>
  );
}
