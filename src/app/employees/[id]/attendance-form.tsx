"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  recordAttendance,
  type AttendanceFormState,
} from "@/actions/attendance";
import { Save } from "lucide-react";

const initial: AttendanceFormState = {};

export default function AttendanceForm({ employeeId }: { employeeId: number }) {
  const [state, action, pending] = useActionState(recordAttendance, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
    }
  }, [state, pending]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
    >
      <input type="hidden" name="employeeId" value={employeeId} />
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          วันที่
        </label>
        <input
          name="date"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          เข้างาน
        </label>
        <input name="checkIn" type="time" className="input" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ออกงาน
        </label>
        <input name="checkOut" type="time" className="input" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          OT (ชม.)
        </label>
        <input
          name="otHours"
          type="number"
          step="0.5"
          min="0"
          defaultValue="0"
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-brand btn-sm">
        <Save size={12} strokeWidth={2.5} />
        {pending ? "..." : "บันทึก"}
      </button>
      {state.message && (
        <div className="col-span-full text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {state.message}
        </div>
      )}
    </form>
  );
}
