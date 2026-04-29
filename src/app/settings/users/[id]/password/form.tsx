"use client";

import { useActionState } from "react";
import { resetUserPassword, type UserFormState } from "@/actions/users";
import { KeyRound, AlertCircle } from "lucide-react";

const initial: UserFormState = {};

export default function ResetPasswordForm({ id }: { id: number }) {
  const bound = resetUserPassword.bind(null, id);
  const [state, action, pending] = useActionState(bound, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          รหัสผ่านใหม่ <span className="text-red-500">*</span>
        </label>
        <input
          name="password"
          type="text"
          required
          autoComplete="new-password"
          className="input"
          placeholder="อย่างน้อย 6 ตัวอักษร"
        />
        <p className="text-[11px] text-zinc-500 mt-1">
          ระบบจะตัด session ที่กำลังใช้งาน — ผู้ใช้ต้องล็อกอินใหม่
        </p>
        {state.errors?.password && (
          <p className="text-xs text-red-600 mt-1">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {state.message && !state.errors && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand">
        <KeyRound size={14} />
        {pending ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
