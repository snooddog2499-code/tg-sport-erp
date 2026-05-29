"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createTransaction,
  type TxnFormState,
} from "@/actions/transactions";
import {
  TXN_TYPE_LABELS,
  categoriesFor,
  type TxnType,
} from "@/lib/finance-types";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const initial: TxnFormState = {};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TransactionForm() {
  const [state, action, pending] = useActionState(createTransaction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<TxnType>("expense");
  const categories = categoriesFor(type);

  useEffect(() => {
    if (state.success && !pending && formRef.current) {
      formRef.current.reset();
      // Reset visual state but preserve the type the user was working on
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {/* Type toggle — pill switch */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ประเภท <span className="text-red-500">*</span>
        </label>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50/50 p-0.5">
          {(["income", "expense"] as const).map((t) => {
            const active = type === t;
            const Icon = t === "income" ? ArrowUpCircle : ArrowDownCircle;
            const tone =
              t === "income" ? "text-emerald-700" : "text-rose-700";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? `bg-white ${tone} shadow-sm border border-zinc-200`
                    : "text-zinc-600 hover:text-ink-900"
                }`}
              >
                <Icon size={14} strokeWidth={2.25} />
                {TXN_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="entryDate"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            วันที่ <span className="text-red-500">*</span>
          </label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            defaultValue={todayYmd()}
            required
            className="input"
          />
          {state.errors?.entryDate && (
            <p className="text-xs text-red-600 mt-1">
              {state.errors.entryDate[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            หมวด <span className="text-red-500">*</span>
          </label>
          <select id="category" name="category" required className="input">
            <option value="">-- เลือกหมวด --</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {state.errors?.category && (
            <p className="text-xs text-red-600 mt-1">
              {state.errors.category[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          รายละเอียด <span className="text-red-500">*</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          className="input"
          placeholder={
            type === "income"
              ? "เช่น ขายผ้าผืน 5 ผืน ลูกค้าหน้าร้าน"
              : "เช่น ค่าน้ำมันรถส่งของ"
          }
        />
        {state.errors?.description && (
          <p className="text-xs text-red-600 mt-1">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="amount"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            จำนวนเงิน (บาท) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="input"
            placeholder="0.00"
          />
          {state.errors?.amount && (
            <p className="text-xs text-red-600 mt-1">
              {state.errors.amount[0]}
            </p>
          )}
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
            placeholder="ไม่บังคับ"
          />
        </div>
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
        <Plus size={14} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
