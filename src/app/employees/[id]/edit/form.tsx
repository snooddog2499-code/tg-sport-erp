"use client";

import { useActionState } from "react";
import { updateEmployee, type EmployeeFormState } from "@/actions/employees";
import { Save } from "lucide-react";

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

export default function EditForm({
  id,
  users,
  defaults,
}: {
  id: number;
  users: Array<{ id: number; name: string; email: string }>;
  defaults: {
    name: string;
    dept: string;
    salary: number;
    salaryType: string;
    startDate: string;
    userId: number;
  };
}) {
  const bound = updateEmployee.bind(null, id);
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            แผนก
          </label>
          <select
            name="dept"
            required
            defaultValue={defaults.dept}
            className="input"
          >
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
          <input
            name="startDate"
            type="date"
            defaultValue={defaults.startDate}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            ประเภท
          </label>
          <select
            name="salaryType"
            defaultValue={defaults.salaryType}
            className="input"
          >
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
            defaultValue={defaults.salary}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          บัญชีล็อกอิน
        </label>
        <select
          name="userId"
          defaultValue={defaults.userId || ""}
          className="input"
        >
          <option value="">— ไม่เชื่อมกับบัญชี —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {state.errors && (
        <p className="text-xs text-red-600">
          กรุณาตรวจข้อมูลอีกครั้ง
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand">
        <Save size={14} />
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
