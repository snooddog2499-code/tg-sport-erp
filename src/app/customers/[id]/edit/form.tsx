"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCustomer, type CustomerFormState } from "@/actions/customers";
import type { Customer } from "@/db/schema";

export default function EditCustomerForm({
  customer,
}: {
  customer: Customer;
}) {
  const action = updateCustomer.bind(null, customer.id);
  const [state, formAction, pending] = useActionState<
    CustomerFormState,
    FormData
  >(action, {});

  return (
    <form
      action={formAction}
      className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5"
    >
      <Field label="ชื่อ" required error={state.errors?.name}>
        <input
          name="name"
          type="text"
          required
          defaultValue={customer.name}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="เบอร์โทร">
          <input
            name="phone"
            type="text"
            defaultValue={customer.phone ?? ""}
            className="input"
          />
        </Field>
        <Field label="LINE ID">
          <input
            name="lineId"
            type="text"
            defaultValue={customer.lineId ?? ""}
            className="input"
          />
        </Field>
      </div>

      <Field label="อีเมล">
        <input
          name="email"
          type="email"
          defaultValue={customer.email ?? ""}
          className="input"
        />
      </Field>

      <Field label="ที่อยู่">
        <textarea
          name="address"
          rows={2}
          defaultValue={customer.address ?? ""}
          className="input"
        />
      </Field>

      <Field label="ระดับ">
        <select name="tier" defaultValue={customer.tier} className="input">
          <option value="new">ใหม่</option>
          <option value="regular">ประจำ</option>
          <option value="vip">VIP</option>
        </select>
      </Field>

      <fieldset className="rounded-md border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
        <legend className="px-2 text-sm font-medium text-zinc-700">
          โปรโมชั่นสำหรับสมาชิก
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 input cursor-pointer bg-white">
            <input
              type="checkbox"
              name="freeShipping"
              defaultChecked={!!customer.freeShipping}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-sm">🚚 ส่งฟรี</span>
          </label>
          <Field label="ส่วนลดประจำ (%)">
            <input
              name="defaultDiscountPct"
              type="number"
              min={0}
              max={100}
              step="0.1"
              defaultValue={customer.defaultDiscountPct ?? 0}
              className="input bg-white"
              placeholder="เช่น 10"
            />
          </Field>
        </div>
      </fieldset>

      <Field label="หมายเหตุ">
        <textarea
          name="note"
          rows={3}
          defaultValue={customer.note ?? ""}
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
          href={`/customers/${customer.id}`}
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
