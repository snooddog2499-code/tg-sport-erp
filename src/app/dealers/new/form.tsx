"use client";

import { useActionState, useState } from "react";
import { createDealer, type DealerFormState } from "@/actions/dealers";
import { UserPlus, ChevronDown, Award } from "lucide-react";
import {
  PARTNER_STANDARD_RATES,
  PARTNER_ADDON_NOTES,
} from "@/lib/partner-rates";

const initial: DealerFormState = {};

export default function DealerForm() {
  const [state, action, pending] = useActionState(createDealer, initial);
  const [seedPartner, setSeedPartner] = useState(true);
  const [showRateDetail, setShowRateDetail] = useState(false);

  // Group rates by garment type for the preview list
  const ratesByType = PARTNER_STANDARD_RATES.reduce<
    Record<string, { minQty: number; price: number }[]>
  >((acc, r) => {
    (acc[r.garmentType] ??= []).push({ minQty: r.minQty, price: r.price });
    return acc;
  }, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อตัวแทน/ร้าน <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          className="input"
          placeholder="เช่น ร้านกีฬาสยาม, ตัวแทนขอนแก่น"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            เบอร์โทร
          </label>
          <input name="phone" className="input" placeholder="081-xxx-xxxx" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            LINE ID
          </label>
          <input name="lineId" className="input" placeholder="@shopname" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          อีเมล
        </label>
        <input
          name="email"
          type="email"
          className="input"
          placeholder="contact@shop.co"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ที่อยู่
        </label>
        <textarea name="address" rows={2} className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            ส่วนลดราคาขายส่ง (%)
          </label>
          <input
            name="discountPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue="10"
            className="input"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            ลดจากราคาปกติก่อนตัวแทนมาขายต่อ
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Commission (%)
          </label>
          <input
            name="commissionPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue="5"
            className="input"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            ส่วนที่โรงงานต้องจ่ายให้ตัวแทน
          </p>
        </div>
      </div>

      {/* Partner standard rate seeding */}
      <div className="rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50/60 to-amber-50/30 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="seedPartnerRates"
            checked={seedPartner}
            onChange={(e) => setSeedPartner(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-600 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <Award size={14} className="text-amber-700" />
              ตั้งเรทราคามาตรฐาน Partner (6 เดือนขึ้นไป)
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              ระบบจะเพิ่มราคา {PARTNER_STANDARD_RATES.length} รายการให้โดยอัตโนมัติ
              ตามเรท Partner ที่ TG Sport ใช้
              — แก้ไขทีหลังได้ที่หน้าตัวแทน
            </p>
          </div>
        </label>

        <button
          type="button"
          onClick={() => setShowRateDetail((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900 ml-7"
        >
          <ChevronDown
            size={12}
            className={`transition-transform ${
              showRateDetail ? "rotate-180" : ""
            }`}
          />
          {showRateDetail ? "ซ่อนเรท" : "ดูรายละเอียดเรททั้งหมด"}
        </button>

        {showRateDetail && (
          <div className="ml-7 mt-2 bg-white border border-amber-200 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-amber-50/60 text-amber-900">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">ประเภท</th>
                  <th className="text-right px-3 py-2 font-medium">10–50</th>
                  <th className="text-right px-3 py-2 font-medium">51–500</th>
                  <th className="text-right px-3 py-2 font-medium">1000+</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ratesByType).map(([type, tiers]) => {
                  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
                  return (
                    <tr key={type} className="border-t border-amber-100">
                      <td className="px-3 py-2 text-zinc-700">{type}</td>
                      {sorted.map((t, i) => (
                        <td
                          key={i}
                          className="px-3 py-2 text-right tabular-nums font-semibold text-zinc-800"
                        >
                          ฿{t.price}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-3 py-2 bg-amber-50/40 border-t border-amber-200">
              <p className="text-[10px] font-medium text-amber-900 mb-1">
                ออปชั่นเพิ่มเติม (คิดเพิ่มต่อตัว)
              </p>
              <ul className="text-[10px] text-amber-800 space-y-0.5">
                {PARTNER_ADDON_NOTES.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          หมายเหตุ
        </label>
        <textarea name="note" rows={2} className="input" />
      </div>

      <button type="submit" disabled={pending} className="btn btn-brand">
        <UserPlus size={14} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "เพิ่มตัวแทน"}
      </button>
    </form>
  );
}
