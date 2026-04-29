import Link from "next/link";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { UserPlus, Pencil, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import { toggleUserActive, deleteUser } from "@/actions/users";
import { getCurrentUser } from "@/lib/auth";
import ConfirmButton from "@/app/orders/[id]/confirm-button";
import RoleAvatar from "@/components/RoleAvatar";

export const metadata = { title: "ผู้ใช้งาน — ตั้งค่า" };

const roleLabels: Record<string, string> = {
  owner: "เจ้าของ",
  manager: "ผู้จัดการ",
  admin: "แอดมิน",
  graphic: "กราฟฟิก",
  print: "ช่างพิมพ์",
  roll: "ช่างรีดโรล",
  laser: "ช่างเลเซอร์",
  sew: "ช่างเย็บ",
  qc: "QC",
  dealer: "ตัวแทน",
};

const roleTone: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800",
  manager: "bg-purple-100 text-purple-800",
  admin: "bg-sky-100 text-sky-700",
  graphic: "bg-pink-100 text-pink-700",
  print: "bg-sky-100 text-sky-700",
  roll: "bg-orange-100 text-orange-700",
  laser: "bg-indigo-100 text-indigo-700",
  sew: "bg-teal-100 text-teal-700",
  qc: "bg-emerald-100 text-emerald-700",
  dealer: "bg-zinc-100 text-zinc-700",
};

export default async function UsersListPage() {
  const me = await getCurrentUser();
  const users = await db
    .select()
    .from(schema.users)
    .orderBy(asc(schema.users.role), asc(schema.users.name));

  return (
    <>
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            ผู้ใช้งาน
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {users.length} บัญชี · เจ้าของสร้าง / ปิดการใช้งาน /
            เปลี่ยนรหัสผ่านพนักงานได้ที่นี่
          </p>
        </div>
        <Link href="/settings/users/new" className="btn btn-brand btn-sm">
          <UserPlus size={14} strokeWidth={2.5} />
          เพิ่มผู้ใช้งาน
        </Link>
      </header>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-5 py-3 font-medium">ชื่อ</th>
                <th className="text-left px-3 py-3 font-medium">อีเมล</th>
                <th className="text-left px-3 py-3 font-medium">บทบาท</th>
                <th className="text-left px-3 py-3 font-medium">แผนก</th>
                <th className="text-center px-3 py-3 font-medium">สถานะ</th>
                <th className="text-right px-5 py-3 font-medium w-48">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <RoleAvatar role={u.role} size="md" />
                      <span className="font-medium text-ink-900">
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-600 text-xs font-mono">
                    {u.email}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`badge-plain ${
                        roleTone[u.role] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-500 text-xs">
                    {u.dept ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.active ? (
                      <span className="badge-plain bg-emerald-100 text-emerald-700">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="badge-plain bg-zinc-100 text-zinc-500">
                        พ้นสภาพ
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/settings/users/${u.id}/edit`}
                        className="btn btn-outline btn-xs"
                        title="แก้ไข"
                      >
                        <Pencil size={11} />
                      </Link>
                      <Link
                        href={`/settings/users/${u.id}/password`}
                        className="btn btn-outline btn-xs"
                        title="ตั้งรหัสผ่านใหม่"
                      >
                        <KeyRound size={11} />
                      </Link>
                      {u.role !== "owner" && (
                        <form
                          action={async () => {
                            "use server";
                            await toggleUserActive(u.id);
                          }}
                        >
                          <button
                            type="submit"
                            className={`btn btn-xs ${
                              u.active ? "btn-ghost" : "btn-brand"
                            }`}
                            title={u.active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}
                          >
                            {u.active ? (
                              <UserX size={11} className="text-red-600" />
                            ) : (
                              <UserCheck size={11} />
                            )}
                          </button>
                        </form>
                      )}
                      {u.role !== "owner" && me?.id !== u.id && (
                        <form
                          action={async () => {
                            "use server";
                            await deleteUser(u.id);
                          }}
                        >
                          <ConfirmButton
                            message={`ลบผู้ใช้ "${u.name}" ถาวร?\n\nออเดอร์/งานที่อ้างอิงถึงผู้ใช้คนนี้จะถูกตั้งเป็น "ไม่ระบุ" — ออเดอร์จะไม่หายไป แต่จะไม่มีชื่อผู้รับผิดชอบ`}
                            className="btn btn-ghost btn-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={11} />
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
