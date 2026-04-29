"use client";

import { useActionState, useRef, useEffect } from "react";
import { restockMaterial, type MaterialFormState } from "@/actions/materials";
import { Plus } from "lucide-react";

const initial: MaterialFormState = {};

export default function RestockForm({
  materialId,
  currentStock,
  unit,
}: {
  materialId: number;
  currentStock: number;
  unit: string;
}) {
  const [state, action, pending] = useActionState(restockMaterial, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="materialId" value={materialId} />
      <div>
        <label
          htmlFor={`restock-qty-${materialId}`}
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          จำนวน ({unit})
        </label>
        <input
          id={`restock-qty-${materialId}`}
          name="qty"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="input"
          placeholder="0"
        />
        {state.errors?.qty && (
          <p className="text-xs text-red-600 mt-1">{state.errors.qty[0]}</p>
        )}
      </div>
      <div>
        <label
          htmlFor={`restock-note-${materialId}`}
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          หมายเหตุ (ไม่บังคับ)
        </label>
        <input
          id={`restock-note-${materialId}`}
          name="note"
          type="text"
          className="input"
          placeholder="เช่น ใบเสนอราคา #1234, ร้าน ABC"
        />
      </div>
      {state.message && (
        <div
          className={`text-xs rounded-md px-3 py-2 ${
            state.errors
              ? "text-red-700 bg-red-50 border border-red-200"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
          }`}
        >
          {state.message}
        </div>
      )}
      <p className="text-xs text-zinc-500">
        สต็อกปัจจุบัน:{" "}
        <span className="font-semibold tabular-nums">{currentStock}</span> {unit}
      </p>
      <button type="submit" disabled={pending} className="btn btn-brand btn-sm">
        <Plus size={13} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "บันทึกรับเข้า"}
      </button>
    </form>
  );
}
