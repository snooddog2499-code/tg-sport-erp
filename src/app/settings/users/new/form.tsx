"use client";

import { useActionState } from "react";
import { createUser, type UserFormState } from "@/actions/users";
import { UserPlus } from "lucide-react";

const initial: UserFormState = {};

const ROLE_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "manager", label: "ผู้จัดการโรงงาน", hint: "เห็นทุกเมนู ยกเว้นตั้งค่าสิทธิ์" },
  { value: "admin", label: "แอดมิน", hint: "รับออเดอร์ + ลูกค้า + ชำระเงิน" },
  { value: "graphic", label: "กราฟฟิก", hint: "อัปโหลดลาย + ขั้นตอนกราฟฟิก" },
  { value: "print", label: "ช่างพิมพ์", hint: "ขั้นตอนสั่งพิมพ์" },
  { value: "roll", label: "ช่างรีดโรล", hint: "ขั้นตอนรีดโรล" },
  { value: "laser", label: "ช่างเลเซอร์", hint: "ขั้นตอนตัดเลเซอร์" },
  { value: "sew", label: "ช่างเย็บ", hint: "ขั้นตอนเย็บ" },
  { value: "qc", label: "QC", hint: "ขั้นตอนรีดและตรวจสอบ" },
  { value: "dealer", label: "ตัวแทนจำหน่าย", hint: "พอร์ทัลตัวแทน" },
];

export default function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          ชื่อ <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          className="input"
          placeholder="เช่น สมชาย ใจดี"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-600 mt-1">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          อีเมล (ใช้ล็อกอิน) <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          className="input"
          placeholder="staff@tgsport.co"
        />
        {state.errors?.email && (
          <p className="text-xs text-red-600 mt-1">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          รหัสผ่านเริ่มต้น <span className="text-red-500">*</span>
        </label>
        <input
          name="password"
          type="text"
          required
          autoComplete="new-password"
          className="input"
          placeholder="อย่างน้อย 6 ตัวอักษร"
          defaultValue="password123"
        />
        <p className="text-[11px] text-zinc-500 mt-1">
          ผู้ใช้สามารถใช้รหัสนี้ล็อกอินครั้งแรก —
          ควรแจ้งให้เจ้าตัวเปลี่ยนภายหลัง
        </p>
        {state.errors?.password && (
          <p className="text-xs text-red-600 mt-1">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          บทบาท <span className="text-red-500">*</span>
        </label>
        <select name="role" required defaultValue="" className="input">
          <option value="" disabled>
            -- เลือก --
          </option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label} — {r.hint}
            </option>
          ))}
        </select>
        {state.errors?.role && (
          <p className="text-xs text-red-600 mt-1">{state.errors.role[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          แผนก (ไม่บังคับ)
        </label>
        <input
          name="dept"
          className="input"
          placeholder="เช่น graphic, print, sew"
        />
        <p className="text-[11px] text-zinc-500 mt-1">
          ใช้เป็นข้อมูลแสดงผลในหน้าพนักงาน
        </p>
      </div>

      <button type="submit" disabled={pending} className="btn btn-brand">
        <UserPlus size={14} strokeWidth={2.5} />
        {pending ? "กำลังสร้าง..." : "เพิ่มผู้ใช้งาน"}
      </button>
    </form>
  );
}
