"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateOrderMeta, type OrderFormState } from "@/actions/orders";
import type { Order } from "@/db/schema";

type CustomerOption = { id: number; name: string; tier: string };
type GraphicUser = { id: number; name: string };

export default function EditOrderForm({
  order,
  customers,
  graphicUsers,
}: {
  order: Order;
  customers: CustomerOption[];
  graphicUsers: GraphicUser[];
}) {
  const action = updateOrderMeta.bind(null, order.id);
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    action,
    {}
  );

  return (
    <form
      action={formAction}
      className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5"
    >
      <Field label="ลูกค้า" required error={state.errors?.customerId}>
        <select
          name="customerId"
          required
          defaultValue={String(order.customerId)}
          className="input"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.tier === "vip" ? "⭐" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="วันที่ต้องการรับของ">
        <input
          name="deadline"
          type="date"
          defaultValue={order.deadline ?? ""}
          className="input"
        />
      </Field>

      <Field label="กราฟฟิกผู้รับผิดชอบ">
        <select
          name="assignedGraphicId"
          defaultValue={order.assignedGraphicId ?? ""}
          className="input"
        >
          <option value="">— ยังไม่มอบหมาย —</option>
          {graphicUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="ส่วนลด (บาท)">
          <input
            name="discount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={order.discount ?? 0}
            className="input"
          />
        </Field>
        <Field label="ค่าขนส่ง (บาท)">
          <input
            name="shipping"
            type="number"
            min={0}
            step="0.01"
            defaultValue={order.shipping ?? 0}
            className="input"
          />
        </Field>
        <Field label="VAT 7%">
          <label className="flex items-center gap-2 input cursor-pointer">
            <input
              type="checkbox"
              name="vatToggle"
              defaultChecked={(order.vatRate ?? 0) > 0}
              onChange={(e) => {
                const hidden = (e.target.form?.elements.namedItem(
                  "vatRate"
                ) as HTMLInputElement) ?? null;
                if (hidden) hidden.value = e.target.checked ? "0.07" : "0";
              }}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm">คิด VAT 7%</span>
          </label>
          <input
            type="hidden"
            name="vatRate"
            defaultValue={(order.vatRate ?? 0) > 0 ? "0.07" : "0"}
          />
        </Field>
      </div>

      <Field label="หมายเหตุ">
        <textarea
          name="notes"
          rows={4}
          defaultValue={order.notes ?? ""}
          className="input"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-md font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <Link
          href={`/orders/${order.id}`}
          className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-md"
        >
          ยกเลิก
        </Link>
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
      <span className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error?.map((msg, i) => (
        <p key={i} className="text-xs text-red-600 mt-1">
          {msg}
        </p>
      ))}
    </label>
  );
}
