import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatBaht, formatDateTH } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteMaterial } from "@/actions/materials";
import ConfirmButton from "@/app/orders/[id]/confirm-button";
import RestockForm from "./restock-form";
import AdjustForm from "./adjust-form";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [material] = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, id));
  if (!material) notFound();

  const usages = await db
    .select({
      id: schema.materialUsage.id,
      orderId: schema.materialUsage.orderId,
      qtyUsed: schema.materialUsage.qtyUsed,
      recordedAt: schema.materialUsage.recordedAt,
      orderCode: schema.orders.code,
    })
    .from(schema.materialUsage)
    .leftJoin(
      schema.orders,
      eq(schema.materialUsage.orderId, schema.orders.id)
    )
    .where(eq(schema.materialUsage.materialId, id))
    .orderBy(desc(schema.materialUsage.recordedAt))
    .limit(20);

  const totalUsed = usages.reduce((s, u) => s + (u.qtyUsed ?? 0), 0);

  const user = await getCurrentUser();
  const canManage = !!user && can(user.role, "material:manage");
  const low = (material.stock ?? 0) <= (material.reorderPoint ?? 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/materials"
        className="text-xs text-zinc-500 hover:text-ink-900"
      >
        ← วัตถุดิบทั้งหมด
      </Link>

      <header className="mt-2 mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            {material.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            หน่วย: {material.unit}
            {material.supplier && ` · ซัพ: ${material.supplier}`}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/materials/${id}/edit`}
              className="btn btn-outline btn-sm"
            >
              <Pencil size={12} />
              แก้ไข
            </Link>
          </div>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className={`card p-4 ${low ? "border-red-200 bg-red-50/60" : ""}`}>
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <Package size={13} />
            คงเหลือ
          </div>
          <p
            className={`text-2xl md:text-3xl font-bold tabular-nums ${
              low ? "text-red-700" : "text-ink-900"
            }`}
          >
            {material.stock}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{material.unit}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <AlertTriangle size={13} />
            จุดสั่งซื้อ
          </div>
          <p className="text-2xl md:text-3xl font-bold text-ink-900 tabular-nums">
            {material.reorderPoint}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{material.unit}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <TrendingDown size={13} />
            ต้นทุน/หน่วย
          </div>
          <p className="text-2xl md:text-3xl font-bold text-ink-900 tabular-nums">
            {formatBaht(material.costPerUnit)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
            <TrendingUp size={13} />
            มูลค่าคงคลัง
          </div>
          <p className="text-2xl md:text-3xl font-bold text-ink-900 tabular-nums">
            {formatBaht(
              (material.stock ?? 0) * (material.costPerUnit ?? 0)
            )}
          </p>
        </div>
      </section>

      {canManage && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <h2 className="font-semibold text-ink-900 text-sm mb-1">
              รับเข้าสต็อก (Restock)
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              บวกจำนวนเพิ่มจากสต็อกเดิม
            </p>
            <RestockForm
              materialId={id}
              currentStock={material.stock ?? 0}
              unit={material.unit}
            />
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-ink-900 text-sm mb-1">
              ปรับสต็อก (Adjust)
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              ตั้งจำนวนจริงจากการนับสต็อก
            </p>
            <AdjustForm
              materialId={id}
              currentStock={material.stock ?? 0}
              unit={material.unit}
            />
          </div>
        </section>
      )}

      <section className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-900 text-sm">
              ประวัติการใช้งานล่าสุด
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {usages.length} รายการ · ใช้ไปทั้งหมด {totalUsed} {material.unit}
            </p>
          </div>
        </div>
        {usages.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            ยังไม่มีการบันทึกการใช้
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600 text-xs">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">วันที่</th>
                <th className="text-left px-3 py-2.5 font-medium">ออเดอร์</th>
                <th className="text-right px-5 py-2.5 font-medium">
                  จำนวนที่ใช้
                </th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50"
                >
                  <td className="px-5 py-3 text-zinc-600">
                    {formatDateTH(u.recordedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/orders/${u.orderId}`}
                      className="font-mono text-xs text-brand-600 hover:text-brand-700"
                    >
                      {u.orderCode}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">
                    {u.qtyUsed} {material.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {canManage && (
        <section className="card border-red-200 p-5">
          <h2 className="font-semibold text-red-900 text-sm mb-2">
            โซนอันตราย
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            การลบจะคงประวัติการใช้ที่บันทึกไว้ แต่วัตถุดิบจะหายไปจากรายการ
          </p>
          <form
            action={async () => {
              "use server";
              await deleteMaterial(id);
            }}
          >
            <ConfirmButton
              message={`ลบ "${material.name}"? ย้อนกลับไม่ได้`}
              className="btn btn-danger btn-sm"
            >
              <Trash2 size={12} />
              ลบวัตถุดิบ
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
