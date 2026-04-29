"use client";

import { useActionState } from "react";
import { updateMaterial, type MaterialFormState } from "@/actions/materials";
import { Save } from "lucide-react";

const initial: MaterialFormState = {};

export default function EditForm({
  id,
  defaultValues,
}: {
  id: number;
  defaultValues: {
    name: string;
    unit: string;
    reorderPoint: number;
    costPerUnit: number;
    supplier: string;
  };
}) {
  const bound = updateMaterial.bind(null, id);
  const [state, action, pending] = useActionState(bound, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อวัตถุดิบ
        </label>
        <input
          name="name"
          defaultValue={defaultValues.name}
          required
          className="input"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            หน่วย
          </label>
          <input
            name="unit"
            defaultValue={defaultValues.unit}
            required
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            ต้นทุน/หน่วย
          </label>
          <input
            name="costPerUnit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues.costPerUnit}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          จุดสั่งซื้อ
        </label>
        <input
          name="reorderPoint"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues.reorderPoint}
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ซัพพลายเออร์
        </label>
        <input
          name="supplier"
          defaultValue={defaultValues.supplier}
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-brand">
        <Save size={14} />
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
