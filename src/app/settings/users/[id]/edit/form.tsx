"use client";

import { useActionState } from "react";
import { updateUser, type UserFormState } from "@/actions/users";
import { Save } from "lucide-react";

const initial: UserFormState = {};

const ROLE_OPTIONS = [
  { value: "manager", label: "ผู้จัดการโรงงาน" },
  { value: "admin", label: "แอดมิน" },
  { value: "graphic", label: "กราฟฟิก" },
  { value: "print", label: "ช่างพิมพ์" },
  { value: "roll", label: "ช่างรีดโรล" },
  { value: "laser", label: "ช่างเลเซอร์" },
  { value: "sew", label: "ช่างเย็บ" },
  { value: "qc", label: "QC" },
  { value: "dealer", label: "ตัวแทนจำหน่าย" },
  { value: "owner", label: "เจ้าของ" },
];

export default function EditUserForm({
  id,
  defaults,
}: {
  id: number;
  defaults: { name: string; role: string; dept: string };
}) {
  const bound = updateUser.bind(null, id);
  const [state, action, pending] = useActionState(bound, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อ
        </label>
        <input
          name="name"
          required
          defaultValue={defaults.name}
          className="input"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          บทบาท
        </label>
        <select name="role" required defaultValue={defaults.role} className="input">
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {state.errors?.role && (
          <p className="text-xs text-red-600 mt-1">{state.errors.role[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          แผนก
        </label>
        <input name="dept" defaultValue={defaults.dept} className="input" />
      </div>

      <button type="submit" disabled={pending} className="btn btn-brand">
        <Save size={14} />
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
