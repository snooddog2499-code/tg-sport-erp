"use client";

import { useActionState } from "react";
import { createDealer, type DealerFormState } from "@/actions/dealers";
import { UserPlus } from "lucide-react";

const initial: DealerFormState = {};

export default function DealerForm() {
  const [state, action, pending] = useActionState(createDealer, initial);

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
