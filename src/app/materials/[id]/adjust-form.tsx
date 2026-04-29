"use client";

import { useActionState, useRef, useEffect } from "react";
import { adjustStock, type MaterialFormState } from "@/actions/materials";
import { Settings2 } from "lucide-react";

const initial: MaterialFormState = {};

export default function AdjustForm({
  materialId,
  currentStock,
  unit,
}: {
  materialId: number;
  currentStock: number;
  unit: string;
}) {
  const [state, action, pending] = useActionState(adjustStock, initial);
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
          htmlFor={`adjust-stock-${materialId}`}
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          จำนวนจริง ({unit})
        </label>
        <input
          id={`adjust-stock-${materialId}`}
          name="newStock"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={currentStock}
          className="input"
        />
        {state.errors?.newStock && (
          <p className="text-xs text-red-600 mt-1">
            {state.errors.newStock[0]}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={`adjust-reason-${materialId}`}
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          เหตุผล
        </label>
        <input
          id={`adjust-reason-${materialId}`}
          name="reason"
          type="text"
          required
          className="input"
          placeholder="เช่น นับสต็อกเดือน, เสียจากน้ำ, หาย"
        />
        {state.errors?.reason && (
          <p className="text-xs text-red-600 mt-1">
            {state.errors.reason[0]}
          </p>
        )}
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
      <button
        type="submit"
        disabled={pending}
        className="btn btn-outline btn-sm"
      >
        <Settings2 size={13} />
        {pending ? "กำลังบันทึก..." : "ปรับสต็อก"}
      </button>
    </form>
  );
}
