"use client";

import { useActionState, useState } from "react";
import { recordPayment, type PaymentFormState } from "@/actions/payments";

const METHODS = [
  { value: "cash", label: "เงินสด" },
  { value: "transfer", label: "โอน" },
  { value: "promptpay", label: "พร้อมเพย์" },
  { value: "credit_card", label: "บัตรเครดิต" },
  { value: "other", label: "อื่น ๆ" },
];

export default function PaymentForm({
  orderId,
  balance,
}: {
  orderId: number;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    PaymentFormState,
    FormData
  >(recordPayment, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium"
      >
        + บันทึกการจ่าย
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3"
      key={state.message}
    >
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="ยอดที่รับ (บาท)" required error={state.errors?.amount}>
          <input
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            defaultValue={balance > 0 ? balance : ""}
            required
            className="input"
            placeholder={`คงเหลือ ${balance.toLocaleString()}`}
          />
        </Field>
        <Field label="วิธี" required error={state.errors?.method}>
          <select name="method" required defaultValue="cash" className="input">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="หมายเหตุ">
        <input
          name="note"
          type="text"
          className="input"
          placeholder="เช่น เลขที่โอน, ชื่อผู้โอน"
        />
      </Field>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md"
        >
          ยกเลิก
        </button>
        {state.message && (
          <span className="text-sm text-emerald-700 ml-auto">
            ✓ {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error?.map((msg, i) => (
        <p key={i} className="text-xs text-red-600 mt-1">
          {msg}
        </p>
      ))}
    </label>
  );
}
