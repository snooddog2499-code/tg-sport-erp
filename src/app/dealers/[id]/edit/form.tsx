"use client";

import { useActionState } from "react";
import { updateDealer, type DealerFormState } from "@/actions/dealers";
import { Save } from "lucide-react";

const initial: DealerFormState = {};

export default function EditForm({
  id,
  defaults,
}: {
  id: number;
  defaults: {
    name: string;
    phone: string;
    lineId: string;
    email: string;
    address: string;
    commissionPct: number;
    discountPct: number;
    note: string;
  };
}) {
  const bound = updateDealer.bind(null, id);
  const [state, action, pending] = useActionState(bound, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อตัวแทน/ร้าน
        </label>
        <input
          name="name"
          required
          defaultValue={defaults.name}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            เบอร์โทร
          </label>
          <input name="phone" defaultValue={defaults.phone} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            LINE ID
          </label>
          <input
            name="lineId"
            defaultValue={defaults.lineId}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          อีเมล
        </label>
        <input
          name="email"
          type="email"
          defaultValue={defaults.email}
          className="input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ที่อยู่
        </label>
        <textarea
          name="address"
          rows={2}
          defaultValue={defaults.address}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Discount (%)
          </label>
          <input
            name="discountPct"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={defaults.discountPct}
            className="input"
          />
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
            defaultValue={defaults.commissionPct}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          หมายเหตุ
        </label>
        <textarea
          name="note"
          rows={2}
          defaultValue={defaults.note}
          className="input"
        />
      </div>

      {state.errors && (
        <p className="text-xs text-red-600">กรุณาตรวจข้อมูลอีกครั้ง</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand">
        <Save size={14} />
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
