import { db, schema } from "@/db";
import { asc, ne } from "drizzle-orm";
import { requirePerm } from "@/lib/permissions";
import {
  MENU_ITEMS,
  loadAllMenuOverrides,
  levelAllows,
} from "@/lib/menu-access";
import { Settings, Crown, Lock } from "lucide-react";
import UserPermissionsRow from "./user-permissions-row";

export const metadata = { title: "ตั้งค่าผู้ใช้งาน — TG Sport ERP" };

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

export default async function PermissionsPage() {
  await requirePerm("settings:manage");

  const users = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      active: schema.users.active,
    })
    .from(schema.users)
    .where(ne(schema.users.role, "owner"))
    .orderBy(asc(schema.users.role), asc(schema.users.name));

  const overrides = await loadAllMenuOverrides();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight flex items-center gap-2">
          <Settings size={24} /> ตั้งค่าผู้ใช้งาน
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          เลือกว่าผู้ใช้แต่ละคนจะเห็นเมนูใดบ้าง — เปลี่ยนแล้วมีผลทันที
        </p>
      </header>

      <section className="card p-4 mb-4 flex items-center gap-3 bg-amber-50/40 border-amber-200">
        <Crown size={18} className="text-amber-700 flex-shrink-0" />
        <div className="flex-1 text-xs">
          <p className="font-medium text-amber-900">เจ้าของ (owner)</p>
          <p className="text-amber-800">
            เห็นทุกเมนูเสมอ — ไม่ต้องตั้งค่า
          </p>
        </div>
        <Lock size={14} className="text-amber-700 flex-shrink-0" />
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700 sticky left-0 bg-zinc-50 z-10 min-w-[200px]">
                  ผู้ใช้
                </th>
                {MENU_ITEMS.map((item) => (
                  <th
                    key={item.key}
                    className="text-center px-3 py-3 font-medium text-zinc-700 text-xs whitespace-nowrap"
                  >
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userOverrides = overrides.get(u.id);
                // If user has explicit overrides, use them
                // Otherwise derive from role-based defaults
                const allowedKeys = userOverrides
                  ? userOverrides
                  : new Set(
                      MENU_ITEMS.filter((m) =>
                        levelAllows(u.role, m.defaultLevel)
                      ).map((m) => m.key)
                    );
                const hasOverrides = !!userOverrides;
                return (
                  <UserPermissionsRow
                    key={u.id}
                    user={{
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                      roleLabel: roleLabels[u.role] ?? u.role,
                      active: !!u.active,
                    }}
                    allowedKeys={Array.from(allowedKeys)}
                    hasOverrides={hasOverrides}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-start gap-2 mt-6 p-3 bg-blue-50 rounded-md text-xs text-blue-900">
        <Settings size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">วิธีใช้</p>
          <ul className="space-y-0.5">
            <li>
              · ติ๊กเครื่องหมายถูกเพื่อให้ผู้ใช้คนนั้นเห็นเมนูนั้น
              เอาออกเพื่อซ่อน
            </li>
            <li>
              · ผู้ใช้ที่ไม่ได้ตั้งค่าเลย จะเห็นเมนูตาม{" "}
              <span className="font-medium">บทบาท (role)</span> ของตนเอง
            </li>
            <li>
              · กดปุ่ม &quot;คืนค่าตามบทบาท&quot; ของแต่ละคน
              เพื่อกลับไปใช้ค่าเริ่มต้นตาม role
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
