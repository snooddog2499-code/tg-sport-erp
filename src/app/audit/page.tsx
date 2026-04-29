import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { formatDateTH } from "@/lib/format";

const actionLabels: Record<string, string> = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  status_change: "เปลี่ยนสถานะ",
  payment_recorded: "บันทึกการจ่าย",
  stage_advanced: "อัปเดตสเตจ",
  stage_assigned: "มอบหมายงาน",
};

const entityLabels: Record<string, string> = {
  order: "ออเดอร์",
  customer: "ลูกค้า",
  order_item: "รายการสินค้า",
  payment: "การจ่ายเงิน",
  production_stage: "สเตจการผลิต",
  design: "ดีไซน์",
};

export default async function AuditPage() {
  const logs = await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      details: schema.auditLog.details,
      at: schema.auditLog.at,
      userName: schema.users.name,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .orderBy(desc(schema.auditLog.at))
    .limit(200);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">ประวัติการกระทำ</h1>
        <p className="text-sm text-zinc-500 mt-1">
          บันทึกกิจกรรมล่าสุด 200 รายการ — ใช้สำหรับตรวจสอบและติดตามข้อผิดพลาด
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center text-sm text-zinc-500">
          ยังไม่มีกิจกรรม
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {logs.map((l) => {
              const detail = parseDetails(l.details);
              const href = linkFor(l.entity as string, l.entityId);
              return (
                <li key={l.id} className="px-4 md:px-5 py-3 hover:bg-zinc-50">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-zinc-900">
                      {l.userName ?? "ระบบ"}
                    </span>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {formatDateTH(l.at)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 mt-0.5">
                    <span className="text-zinc-500">
                      {actionLabels[l.action] ?? l.action}{" "}
                      {entityLabels[l.entity] ?? l.entity}
                    </span>{" "}
                    {href ? (
                      <Link
                        href={href}
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        #{l.entityId}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-zinc-500">
                        #{l.entityId}
                      </span>
                    )}
                    {detail && (
                      <span className="ml-2 text-xs text-zinc-400">
                        {detail}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function parseDetails(d: string | null): string | null {
  if (!d) return null;
  try {
    const obj = JSON.parse(d) as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" · ");
  } catch {
    return d;
  }
}

function linkFor(entity: string, id: number | null): string | null {
  if (id == null) return null;
  if (entity === "order") return `/orders/${id}`;
  if (entity === "customer") return `/customers/${id}`;
  return null;
}
