"use client";

import { useActionState, useMemo, useState } from "react";
import { addItem, type ItemFormState } from "@/actions/items";
import { settings } from "@/lib/settings";

export default function AddItemForm({ orderId }: { orderId: number }) {
  const [open, setOpen] = useState(false);
  const action = addItem.bind(null, orderId);
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(
    action,
    {}
  );
  const [sizes, setSizes] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.sizes.map((s) => [s, ""]))
  );

  const sizeBreakdownJson = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const [k, v] of Object.entries(sizes)) {
      const n = parseInt(v, 10) || 0;
      if (n > 0) obj[k] = n;
    }
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : "";
  }, [sizes]);

  if (!open) {
    return (
      <div className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-sm font-medium"
        >
          + เพิ่มรายการ
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="p-4 bg-zinc-50 space-y-4 border-t border-zinc-200"
      key={state.message /* reset form on success */}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="ประเภท" required error={state.errors?.garmentType}>
          <select
            name="garmentType"
            required
            defaultValue=""
            className="input"
          >
            <option value="" disabled>
              -- เลือก --
            </option>
            {settings.garmentTypes.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="แบบคอเสื้อ" error={state.errors?.collar}>
          <select name="collar" defaultValue="" className="input">
            <option value="">— ยังไม่ระบุ —</option>
            {settings.collarTypes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="จำนวนรวม" required error={state.errors?.qty}>
          <input
            name="qty"
            type="number"
            min={1}
            required
            className="input"
            placeholder="รวมทุกไซส์"
          />
        </Field>
        <Field label="ราคา/ตัว (บาท)" error={state.errors?.unitPrice}>
          <input
            name="unitPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className="input"
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-700 mb-2">
          แยกไซส์ (ถ้ามี)
        </legend>
        <input type="hidden" name="sizeBreakdownJson" value={sizeBreakdownJson} />
        <div className="mb-2">
          <p className="text-[11px] font-medium text-zinc-500 mb-1">เด็ก</p>
          <div className="grid grid-cols-5 gap-1.5">
            {settings.sizes
              .filter((s) => s.startsWith("K"))
              .map((s) => (
                <label key={s} className="block text-center">
                  <span className="text-[10px] text-zinc-600 block leading-tight">
                    {s}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={sizes[s]}
                    onChange={(e) =>
                      setSizes((prev) => ({ ...prev, [s]: e.target.value }))
                    }
                    className="input text-center text-sm px-1"
                    placeholder="0"
                  />
                </label>
              ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-500 mb-1">ผู้ใหญ่</p>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
            {settings.sizes
              .filter((s) => !s.startsWith("K"))
              .map((s) => (
                <label key={s} className="block text-center">
                  <span className="text-[10px] text-zinc-600 block leading-tight">
                    {s}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={sizes[s]}
                    onChange={(e) =>
                      setSizes((prev) => ({ ...prev, [s]: e.target.value }))
                    }
                    className="input text-center text-sm px-1"
                    placeholder="0"
                  />
                </label>
              ))}
          </div>
        </div>
      </fieldset>

      <Field label="หมายเหตุรายการ">
        <input
          name="note"
          type="text"
          className="input"
          placeholder="เช่น สีน้ำเงิน, เบอร์หลัง"
        />
      </Field>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}
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
