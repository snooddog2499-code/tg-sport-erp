"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  withdrawMaterial,
  type WithdrawFormState,
} from "@/actions/withdrawals";
import {
  DEPT_LABELS,
  ROLE_TO_DEPT,
  type WithdrawalDept,
} from "@/lib/withdrawal-types";
import { PackageMinus } from "lucide-react";

const initial: WithdrawFormState = {};

type Material = {
  id: number;
  name: string;
  unit: string;
  stock: number | null;
};

type Order = { id: number; code: string };

export default function WithdrawForm({
  materials,
  orders,
  userRole,
}: {
  materials: Material[];
  orders: Order[];
  userRole: string;
}) {
  const [state, action, pending] = useActionState(withdrawMaterial, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const defaultDept = ROLE_TO_DEPT[userRole] ?? "other";

  // Track selected material to show stock helper
  const [selectedId, setSelectedId] = useState<number | "">("");
  const selected = materials.find((m) => m.id === selectedId);

  useEffect(() => {
    if (state.success && !pending && formRef.current) {
      formRef.current.reset();
      setSelectedId("");
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="materialId"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            วัตถุดิบ <span className="text-red-500">*</span>
          </label>
          <select
            id="materialId"
            name="materialId"
            required
            value={selectedId}
            onChange={(e) =>
              setSelectedId(e.target.value ? Number(e.target.value) : "")
            }
            className="input"
          >
            <option value="">-- เลือกวัตถุดิบ --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (คงเหลือ {m.stock ?? 0} {m.unit})
              </option>
            ))}
          </select>
          {state.errors?.materialId && (
            <p className="text-xs text-red-600 mt-1">
              {state.errors.materialId[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="qty"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            จำนวน {selected ? `(${selected.unit})` : ""}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="qty"
            name="qty"
            type="number"
            step="0.01"
            min="0.01"
            max={selected?.stock ?? undefined}
            required
            className="input"
            placeholder="0"
          />
          {selected && (
            <p className="text-[11px] text-zinc-500 mt-1">
              สูงสุดที่เบิกได้:{" "}
              <span className="font-semibold tabular-nums">
                {selected.stock ?? 0}
              </span>{" "}
              {selected.unit}
            </p>
          )}
          {state.errors?.qty && (
            <p className="text-xs text-red-600 mt-1">{state.errors.qty[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="dept"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            แผนกที่เบิก <span className="text-red-500">*</span>
          </label>
          <select
            id="dept"
            name="dept"
            required
            defaultValue={defaultDept}
            className="input"
          >
            {Object.entries(DEPT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {state.errors?.dept && (
            <p className="text-xs text-red-600 mt-1">{state.errors.dept[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="orderId"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            ผูกกับออเดอร์ (ไม่บังคับ)
          </label>
          <select id="orderId" name="orderId" className="input">
            <option value="">— ไม่ผูก —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="note"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          หมายเหตุ
        </label>
        <input
          id="note"
          name="note"
          type="text"
          className="input"
          placeholder="เช่น สำหรับงานพิมพ์ลายชุดทีม XYZ"
        />
      </div>

      {state.message && (
        <div
          className={`text-xs rounded-md px-3 py-2 ${
            state.success
              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
              : "text-red-700 bg-red-50 border border-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand">
        <PackageMinus size={14} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "บันทึกเบิกของ"}
      </button>
    </form>
  );
}

const _DEPT_TYPE: WithdrawalDept = "graphic"; // type-only reference
void _DEPT_TYPE;
