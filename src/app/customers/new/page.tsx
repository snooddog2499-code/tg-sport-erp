"use client";

import { useActionState } from "react";
import { createCustomer, type CustomerFormState } from "@/actions/customers";
import Link from "next/link";

const initialState: CustomerFormState = {};

export default function NewCustomerPage() {
  const [state, formAction, pending] = useActionState(
    createCustomer,
    initialState
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href="/customers"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← กลับรายการสมาชิก
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">เพิ่มสมาชิก</h1>
      </header>

      <form
        action={formAction}
        className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5"
      >
        <Field label="ชื่อ / ทีม / องค์กร" required error={state.errors?.name}>
          <input
            name="name"
            type="text"
            required
            className="input"
            placeholder="เช่น ทีมฟุตบอล อบต.หนองกุงศรี"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="เบอร์โทร">
            <input
              name="phone"
              type="text"
              className="input"
              placeholder="089-xxx-xxxx"
            />
          </Field>
          <Field label="LINE ID">
            <input
              name="lineId"
              type="text"
              className="input"
              placeholder="@yourid"
            />
          </Field>
        </div>

        <Field label="อีเมล">
          <input
            name="email"
            type="email"
            className="input"
            placeholder="customer@example.com"
          />
        </Field>

        <Field label="ที่อยู่">
          <textarea
            name="address"
            rows={2}
            className="input"
            placeholder="ใช้สำหรับส่งของ / ออกใบกำกับ"
          />
        </Field>

        <Field label="ระดับลูกค้า">
          <select name="tier" defaultValue="new" className="input">
            <option value="new">ใหม่</option>
            <option value="regular">ประจำ</option>
            <option value="vip">VIP</option>
          </select>
        </Field>

        <fieldset className="rounded-md border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
          <legend className="px-2 text-sm font-medium text-zinc-700">
            โปรโมชั่นสำหรับสมาชิก (ไม่บังคับ)
          </legend>
          <p className="text-[11px] text-zinc-500 -mt-1">
            ตั้งค่าไว้ให้ลูกค้ารายนี้ ระบบจะเติมส่วนลด/ค่าขนส่งให้อัตโนมัติเมื่อเปิดออเดอร์ใหม่
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 input cursor-pointer bg-white">
              <input
                type="checkbox"
                name="freeShipping"
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
                defaultValue={0}
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
            className="input"
            placeholder="เช่น ชอบสีน้ำเงิน, ติดต่อผ่านคุณจอย"
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
            href="/customers"
            className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-md"
          >
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
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
