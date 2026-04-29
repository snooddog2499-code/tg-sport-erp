"use client";

import { useActionState } from "react";
import { createEmployee, type EmployeeFormState } from "@/actions/employees";
import { UserPlus } from "lucide-react";

const initial: EmployeeFormState = {};

const DEPTS = [
  { value: "admin", label: "แอดมิน" },
  { value: "graphic", label: "กราฟฟิก" },
  { value: "print", label: "พิมพ์" },
  { value: "roll", label: "รีดโรล" },
  { value: "laser", label: "เลเซอร์" },
  { value: "sew", label: "เย็บ" },
  { value: "qc", label: "QC" },
];

export default function EmployeeForm({
  users,
}: {
  users: Array<{ id: number; name: string; email: string }>;
}) {
  const [state, action, pending] = useActionState(createEmployee, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อ <span className="text-red-500">*</span>
        </label>
        <input name="name" required className="input" placeholder="ชื่อพนักงาน" />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            แผนก <span className="text-red-500">*</span>
          </label>
          <select name="dept" required className="input">
            {DEPTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            เริ่มงาน
          </label>
          <input name="startDate" type="date" className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            ประเภทค่าจ้าง
          </label>
          <select name="salaryType" className="input" defaultValue="monthly">
            <option value="monthly">รายเดือน</option>
            <option value="daily">รายวัน</option>
            <option value="piece">รายชิ้น</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            อัตรา (บาท)
          </label>
          <input
            name="salary"
            type="number"
            step="1"
            min="0"
            defaultValue="0"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          เชื่อมกับบัญชีล็อกอิน (ไม่บังคับ)
        </label>
        <select name="userId" className="input" defaultValue="">
          <option value="">— ไม่เชื่อมกับบัญชี —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={pending} className="btn btn-brand">
        <UserPlus size={14} strokeWidth={2.5} />
        {pending ? "กำลังบันทึก..." : "เพิ่มพนักงาน"}
      </button>
    </form>
  );
}
