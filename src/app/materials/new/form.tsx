"use client";

import { useActionState } from "react";
import { createMaterial, type MaterialFormState } from "@/actions/materials";
import { PlusCircle } from "lucide-react";

const initial: MaterialFormState = {};

const UNIT_SUGGESTIONS = ["เมตร", "กิโลกรัม", "ม้วน", "ขวด", "ลิตร", "มล.", "ชิ้น"];

export default function MaterialForm() {
  const [state, action, pending] = useActionState(createMaterial, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          ชื่อวัตถุดิบ <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="input"
          placeholder="เช่น ผ้าไมโครโพลีเอสเตอร์ 150g, หมึก Sublimation สีฟ้า"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="unit"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            หน่วย <span className="text-red-500">*</span>
          </label>
          <input
            id="unit"
            name="unit"
            list="unit-list"
            required
            className="input"
            placeholder="เมตร, กก., ม้วน"
          />
          <datalist id="unit-list">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <div>
          <label
            htmlFor="costPerUnit"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            ต้นทุน/หน่วย (บาท)
          </label>
          <input
            id="costPerUnit"
            name="costPerUnit"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="stock"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            สต็อกเริ่มต้น
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="input"
          />
        </div>
        <div>
          <label
            htmlFor="reorderPoint"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            จุดสั่งซื้อ (เตือนเมื่อต่ำกว่า)
          </label>
          <input
            id="reorderPoint"
            name="reorderPoint"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="input"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="supplier"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          ซัพพลายเออร์ (ไม่บังคับ)
        </label>
        <input
          id="supplier"
          name="supplier"
          type="text"
          className="input"
          placeholder="ชื่อร้าน / เบอร์ / ช่องทางสั่ง"
        />
      </div>

      {state.message && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.message}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand">
        <PlusCircle size={14} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "เพิ่มวัตถุดิบ"}
      </button>
    </form>
  );
}
