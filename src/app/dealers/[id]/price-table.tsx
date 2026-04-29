"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  setDealerPrice,
  deleteDealerPrice,
  type DealerPriceFormState,
} from "@/actions/dealer-prices";
import { settings } from "@/lib/settings";
import { Tag, Trash2, Save } from "lucide-react";

type Price = {
  id: number;
  garmentType: string;
  price: number;
  minQty: number;
  note: string | null;
};

const initial: DealerPriceFormState = {};

export default function PriceTable({
  dealerId,
  prices,
  canManage,
}: {
  dealerId: number;
  prices: Price[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(setDealerPrice, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
    }
  }, [state, pending]);

  const grouped = prices.reduce((acc, p) => {
    (acc[p.garmentType] ??= []).push(p);
    return acc;
  }, {} as Record<string, Price[]>);

  return (
    <section className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Tag size={15} className="text-zinc-500" />
        <div>
          <h2 className="font-semibold text-ink-900 text-sm">
            ราคาตัวแทน (ต่อตัว)
          </h2>
          <p className="text-xs text-zinc-500">
            ตั้งราคาต่อประเภทเสื้อ · ใช้ minQty หลายขั้นได้ เช่น 20+ แพงกว่า 50+
          </p>
        </div>
      </div>

      {prices.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          ยังไม่ได้ตั้งราคา — เพิ่มด้านล่าง
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600 text-xs">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium">ประเภท</th>
              <th className="text-right px-3 py-2.5 font-medium">ขั้นต่ำ</th>
              <th className="text-right px-3 py-2.5 font-medium">ราคา/ตัว</th>
              <th className="text-left px-3 py-2.5 font-medium">หมายเหตุ</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).flatMap(([g, rows]) =>
              rows.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-2.5 text-zinc-700">
                    {i === 0 ? g : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs text-zinc-500">
                    {p.minQty}+
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    ฿{p.price.toLocaleString("th-TH")}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">
                    {p.note ?? ""}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {canManage && (
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => {
                          if (!confirm("ลบราคานี้?")) return;
                          startDelete(async () => {
                            await deleteDealerPrice(p.id, dealerId);
                          });
                        }}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                        aria-label="ลบ"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {canManage && (
        <form
          ref={formRef}
          action={action}
          className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100 grid grid-cols-2 md:grid-cols-6 gap-2 items-end"
        >
          <input type="hidden" name="dealerId" value={dealerId} />
          <div className="col-span-2">
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
              ประเภทเสื้อ
            </label>
            <select name="garmentType" required className="input text-sm">
              <option value="">-- เลือก --</option>
              {settings.garmentTypes.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
              ขั้นต่ำ
            </label>
            <input
              name="minQty"
              type="number"
              min="1"
              defaultValue="1"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
              ราคา/ตัว
            </label>
            <input
              name="price"
              type="number"
              step="0.5"
              min="0"
              required
              className="input text-sm"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
              หมายเหตุ
            </label>
            <input
              name="note"
              className="input text-sm"
              placeholder="ไม่บังคับ"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-brand btn-sm"
          >
            <Save size={12} strokeWidth={2.5} />
            {pending ? "..." : "บันทึก"}
          </button>
          {state.message && (
            <p className="col-span-full text-xs text-emerald-700">
              {state.message}
            </p>
          )}
          {state.errors && (
            <p className="col-span-full text-xs text-red-600">
              กรุณาตรวจข้อมูล
            </p>
          )}
        </form>
      )}
    </section>
  );
}
