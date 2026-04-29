import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Package, PlusCircle, AlertTriangle, Boxes } from "lucide-react";
import { formatBaht } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const metadata = { title: "วัตถุดิบ — TG Sport ERP" };

export default async function MaterialsPage() {
  const materials = await db
    .select()
    .from(schema.materials)
    .orderBy(asc(schema.materials.name));

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "material:manage");

  const lowStock = materials.filter(
    (m) => (m.stock ?? 0) <= (m.reorderPoint ?? 0)
  );
  const totalValue = materials.reduce(
    (s, m) => s + (m.stock ?? 0) * (m.costPerUnit ?? 0),
    0
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            วัตถุดิบ
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            จัดการคลังวัตถุดิบและสต็อก
          </p>
        </div>
        {canManage && (
          <Link href="/materials/new" className="btn btn-brand btn-sm">
            <PlusCircle size={14} strokeWidth={2.5} />
            เพิ่มวัตถุดิบ
          </Link>
        )}
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Boxes size={13} />
            ทั้งหมด
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {materials.length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">รายการ</p>
        </div>
        <div
          className={`card p-4 ${
            lowStock.length > 0
              ? "border-red-200 bg-red-50/60"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <AlertTriangle size={13} />
            ต่ำกว่าจุดสั่งซื้อ
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${
              lowStock.length > 0 ? "text-red-700" : "text-ink-900"
            }`}
          >
            {lowStock.length}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">รายการ</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Package size={13} />
            มูลค่าคงคลัง
          </div>
          <p className="text-2xl font-bold text-ink-900 tabular-nums">
            {formatBaht(totalValue)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">ประมาณการ</p>
        </div>
      </section>

      <section className="card overflow-hidden">
        {materials.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500 mb-3">ยังไม่มีวัตถุดิบ</p>
            {canManage && (
              <Link href="/materials/new" className="btn btn-brand btn-sm">
                <PlusCircle size={13} />
                เพิ่มวัตถุดิบแรก
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">ชื่อ</th>
                  <th className="text-left px-3 py-2.5 font-medium">หน่วย</th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    คงเหลือ
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    จุดสั่งซื้อ
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium">
                    ต้นทุน/หน่วย
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    ซัพพลายเออร์
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const low = (m.stock ?? 0) <= (m.reorderPoint ?? 0);
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-zinc-100 hover:bg-zinc-50/50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/materials/${m.id}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          {m.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-zinc-600">{m.unit}</td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`tabular-nums font-semibold ${
                            low ? "text-red-700" : "text-ink-900"
                          }`}
                        >
                          {m.stock}
                        </span>
                        {low && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                            <AlertTriangle size={9} strokeWidth={2.5} />
                            ต่ำ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-600">
                        {m.reorderPoint}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-zinc-600">
                        {formatBaht(m.costPerUnit)}
                      </td>
                      <td className="px-3 py-3 text-zinc-500 text-xs">
                        {m.supplier ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
