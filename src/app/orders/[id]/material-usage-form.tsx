"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import {
  recordMaterialUsage,
  type UsageFormState,
} from "@/actions/material-usage";
import { Plus } from "lucide-react";

const initial: UsageFormState = {};

export default function UsageForm({
  orderId,
  materials,
}: {
  orderId: number;
  materials: Array<{ id: number; name: string; unit: string; stock: number }>;
}) {
  const bound = recordMaterialUsage.bind(null, orderId);
  const [state, action, pending] = useActionState(bound, initial);
  const [selectedId, setSelectedId] = useState<number | null>(
    materials[0]?.id ?? null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
    }
  }, [state, pending]);

  const selected = materials.find((m) => m.id === selectedId);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-40">
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          วัตถุดิบ
        </label>
        <select
          name="materialId"
          className="input"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(parseInt(e.target.value, 10) || null)}
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} (คงเหลือ {m.stock} {m.unit})
            </option>
          ))}
        </select>
      </div>
      <div className="w-32">
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          จำนวนที่ใช้ {selected ? `(${selected.unit})` : ""}
        </label>
        <input
          name="qtyUsed"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="input"
          placeholder="0"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !selectedId}
        className="btn btn-brand btn-sm"
      >
        <Plus size={13} strokeWidth={2.5} />
        {pending ? "..." : "บันทึกใช้"}
      </button>

      {state.message && (
        <div
          className={`w-full text-xs rounded-md px-3 py-2 ${
            state.errors
              ? "text-red-700 bg-red-50 border border-red-200"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
          }`}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
