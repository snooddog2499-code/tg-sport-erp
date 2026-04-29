import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatBaht, formatDateTH, statusColors, statusLabels } from "@/lib/format";
import { deleteCustomer } from "@/actions/customers";
import ConfirmButton from "@/app/orders/[id]/confirm-button";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, id));

  if (!customer) notFound();

  const orders = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.customerId, id))
    .orderBy(desc(schema.orders.createdAt));

  const totalSpend = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <Link
          href="/customers"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← ลูกค้าทั้งหมด
        </Link>
        <div className="flex items-start justify-between mt-2 flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-zinc-900">{customer.name}</h1>
          <Link
            href={`/customers/${id}/edit`}
            className="px-3 py-1.5 rounded text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
          >
            ✎ แก้ไข
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <InfoCard label="ระดับ" value={customer.tier.toUpperCase()} />
        <InfoCard label="ออเดอร์" value={String(orders.length)} />
        <InfoCard label="ยอดสะสม" value={formatBaht(totalSpend)} />
      </section>

      <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6 space-y-2 text-sm">
        <Row label="เบอร์" value={customer.phone ?? "-"} />
        <Row label="LINE" value={customer.lineId ?? "-"} />
        <Row label="อีเมล" value={customer.email ?? "-"} />
        <Row label="ที่อยู่" value={customer.address ?? "-"} />
        <Row label="หมายเหตุ" value={customer.note ?? "-"} />
        <Row label="เพิ่มเมื่อ" value={formatDateTH(customer.createdAt)} />
      </section>

      {(customer.freeShipping || (customer.defaultDiscountPct ?? 0) > 0) && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-emerald-800 mb-2">
            🎁 โปรโมชั่นประจำ
          </p>
          <div className="flex flex-wrap gap-2">
            {customer.freeShipping && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-emerald-700 text-xs font-medium border border-emerald-200">
                🚚 ส่งฟรี
              </span>
            )}
            {(customer.defaultDiscountPct ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-emerald-700 text-xs font-medium border border-emerald-200">
                🏷️ ส่วนลด {customer.defaultDiscountPct}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-700 mt-2">
            ระบบจะเติมส่วนลด/ค่าขนส่งให้อัตโนมัติเมื่อเปิดออเดอร์ใหม่ของลูกค้ารายนี้
          </p>
        </section>
      )}

      <section className="bg-white rounded-lg border border-zinc-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-200">
          <h2 className="font-semibold text-zinc-900 text-sm">ประวัติการสั่ง</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            ยังไม่มีออเดอร์จากลูกค้ารายนี้
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-500 w-24 flex-shrink-0">
                    {o.code}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[o.status]} flex-shrink-0`}
                  >
                    {statusLabels[o.status as keyof typeof statusLabels]}
                  </span>
                  <span className="flex-1 text-xs text-zinc-500 hidden sm:inline">
                    {formatDateTH(o.deadline)}
                  </span>
                  <span className="tabular-nums text-right font-medium">
                    {formatBaht(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {orders.length === 0 && (
        <section className="bg-white rounded-lg border border-red-200 p-5">
          <h2 className="font-semibold text-red-900 text-sm mb-2">ลบลูกค้า</h2>
          <p className="text-xs text-zinc-500 mb-3">
            ลบได้เฉพาะลูกค้าที่ไม่มีออเดอร์
          </p>
          <form
            action={async () => {
              "use server";
              await deleteCustomer(id);
            }}
          >
            <ConfirmButton
              message="แน่ใจหรือไม่ว่าจะลบลูกค้านี้?"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
            >
              ลบลูกค้า
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3 md:p-4 rounded-lg border border-zinc-200">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg md:text-xl font-semibold text-zinc-900 mt-0.5 truncate">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-24 text-zinc-500 flex-shrink-0">{label}</span>
      <span className="flex-1 text-zinc-900 break-words">{value}</span>
    </div>
  );
}
