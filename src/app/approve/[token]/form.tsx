"use client";

import { useActionState, useState } from "react";
import {
  submitDesignDecision,
  type ApprovalState,
} from "@/actions/public-approval";
import { Check, X, AlertCircle } from "lucide-react";

const initial: ApprovalState = {};

export default function DecisionForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitDesignDecision, initial);
  const [decision, setDecision] = useState<"approved" | "revision" | null>(
    null
  );

  if (state.message) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check size={22} className="text-emerald-600" strokeWidth={3} />
        </div>
        <p className="text-sm text-emerald-800 font-medium">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="decision" value={decision ?? ""} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setDecision("approved")}
          className={`btn p-4 h-auto flex-col gap-1.5 ${
            decision === "approved"
              ? "bg-emerald-600 text-white"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <Check size={20} strokeWidth={2.5} />
          <span className="font-semibold">อนุมัติลาย</span>
          <span className="text-[10px] font-normal opacity-80">
            เริ่มผลิตได้เลย
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDecision("revision")}
          className={`btn p-4 h-auto flex-col gap-1.5 ${
            decision === "revision"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          <X size={20} strokeWidth={2.5} />
          <span className="font-semibold">ขอให้แก้</span>
          <span className="text-[10px] font-normal opacity-80">
            ส่งข้อความแจ้งทีม
          </span>
        </button>
      </div>

      {decision === "revision" && (
        <div>
          <label
            htmlFor="note"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            บอกทีมว่าอยากให้แก้ตรงไหน
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="input"
            placeholder="เช่น ปรับโลโก้ให้ใหญ่ขึ้น เปลี่ยนสีเป็นสีน้ำเงิน"
          />
        </div>
      )}

      {decision === "approved" && (
        <div>
          <label
            htmlFor="note"
            className="block text-xs font-medium text-zinc-700 mb-1.5"
          >
            ข้อความถึงทีม (ถ้ามี)
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            className="input"
            placeholder="ไม่บังคับ"
          />
        </div>
      )}

      {state.error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!decision || pending}
        className={`btn w-full ${
          decision === "approved"
            ? "btn-brand"
            : decision === "revision"
              ? "bg-amber-600 text-white hover:bg-amber-700"
              : "btn-primary"
        }`}
      >
        {pending
          ? "กำลังส่ง..."
          : decision === "approved"
            ? "ยืนยันอนุมัติ"
            : decision === "revision"
              ? "ส่งคำขอแก้ไข"
              : "กรุณาเลือกก่อน"}
      </button>
    </form>
  );
}
