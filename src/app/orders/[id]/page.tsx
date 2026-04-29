import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatBaht,
  formatDateTH,
  stageEmoji,
  stageLabels,
  statusColors,
  statusLabels,
} from "@/lib/format";
import {
  updateOrderStatus,
  deleteOrder,
  type OrderFormState,
} from "@/actions/orders";
import { deleteItem } from "@/actions/items";
import { allowedNext, type OrderStatus } from "@/lib/order-state";
import { BIG_SIZES, BIG_SIZE_SURCHARGE } from "@/lib/order-totals";
import AddItemForm from "./add-item-form";
import PaymentForm from "./payment-form";
import ConfirmButton from "./confirm-button";
import DesignSection from "./design-section";
import AttachmentsSection from "./attachments-section";
import MaterialUsageSection from "./material-usage-section";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id));
  if (!order) notFound();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, order.customerId));

  const [dealer] = order.dealerId
    ? await db
        .select()
        .from(schema.dealers)
        .where(eq(schema.dealers.id, order.dealerId))
    : [undefined];

  const [assignedGraphic] = order.assignedGraphicId
    ? await db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, order.assignedGraphicId))
    : [undefined];

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, id));

  const stages = await db
    .select()
    .from(schema.productionStages)
    .where(eq(schema.productionStages.orderId, id));

  const invoiceRows = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.orderId, id));
  const invoiceIds = invoiceRows.map((i) => i.id);

  const paymentRows =
    invoiceIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.invoiceId, invoiceIds[0]))
          .orderBy(desc(schema.payments.receivedAt));

  const balance =
    (order.total ?? 0) -
    Math.max(order.paid ?? 0, order.deposit ?? 0);
  const nextStatuses = allowedNext(order.status as OrderStatus);
  const user = await getCurrentUser();
  const canEdit = !!user && can(user.role, "order:edit");
  const canDelete = !!user && can(user.role, "order:delete");
  const canChangeStatus = !!user && can(user.role, "order:status");
  const canRecordPayment = !!user && can(user.role, "payment:record");
  const canUseMaterial = !!user && can(user.role, "material:use");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link
          href="/orders"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← ออเดอร์ทั้งหมด
        </Link>
        <div className="flex items-start justify-between gap-3 mt-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 font-mono">
              {order.code}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              ลูกค้า:{" "}
              <Link
                href={`/customers/${order.customerId}`}
                className="text-zinc-900 hover:underline"
              >
                {customer?.name ?? "-"}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-medium ${statusColors[order.status]}`}
            >
              {statusLabels[order.status as keyof typeof statusLabels]}
            </span>
            <a
              href={`/api/orders/${id}/work-order`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              🛠️ ใบงาน
            </a>
            <a
              href={`/api/orders/${id}/quotation`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              📄 ใบเสนอราคา
            </a>
            <a
              href={`/api/orders/${id}/invoice`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              🧾 ใบส่งของ
            </a>
            {canEdit && (
              <Link
                href={`/orders/${id}/edit`}
                className="px-3 py-1 rounded text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              >
                ✎ แก้ไข
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <InfoCard label="ยอดสุทธิ" value={formatBaht(order.total)} />
        <InfoCard label="มัดจำ" value={formatBaht(order.deposit)} />
        <InfoCard label="ชำระแล้ว" value={formatBaht(order.paid)} />
        <InfoCard
          label="คงเหลือ"
          value={formatBaht(balance)}
          highlight={balance > 0}
        />
      </section>

      {(() => {
        const itemsSubtotal = items.reduce(
          (s, it) => s + it.qty * (it.unitPrice ?? 0),
          0
        );
        const allLines = items.flatMap((it) =>
          expandSizeLines(it).map((l) => ({
            ...l,
            garmentType: it.garmentType,
          }))
        );
        const hasMultipleSizes = allLines.length > 1;
        const hasBreakdown =
          hasMultipleSizes ||
          (order.discount ?? 0) > 0 ||
          (order.shipping ?? 0) > 0 ||
          (order.vatAmount ?? 0) > 0 ||
          (order.dealerDiscount ?? 0) > 0 ||
          (order.sizeSurcharge ?? 0) > 0;
        if (!hasBreakdown) return null;
        return (
          <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6 text-sm">
            <p className="text-xs font-medium text-zinc-500 mb-3">
              รายละเอียดยอด
            </p>
            <dl className="space-y-1.5">
              {hasMultipleSizes ? (
                <>
                  {allLines.map((l, i) => (
                    <BreakdownRow
                      key={i}
                      label={
                        <span className="text-zinc-700">
                          {l.garmentType}
                          {l.size && (
                            <>
                              {" · "}
                              <span className="font-mono">{l.size}</span>
                            </>
                          )}{" "}
                          <span className="text-xs text-zinc-500">
                            ({l.qty} × {formatBaht(l.unitPrice)}
                            {l.surcharge > 0 && (
                              <span className="text-amber-700">
                                {" "}+{l.surcharge}
                              </span>
                            )}
                            )
                          </span>
                        </span>
                      }
                      value={formatBaht(l.lineTotal)}
                    />
                  ))}
                  <div className="border-t border-zinc-100 mt-1 pt-1">
                    <BreakdownRow
                      label={
                        <span className="font-medium">ยอดสินค้ารวม</span>
                      }
                      value={
                        <span className="font-medium">
                          {formatBaht(
                            (order.sizeSurcharge ?? 0) + itemsSubtotal
                          )}
                        </span>
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <BreakdownRow
                    label="ยอดสินค้า (รวมทุกรายการ)"
                    value={formatBaht(itemsSubtotal)}
                  />
                  {(order.sizeSurcharge ?? 0) > 0 && (
                    <BreakdownRow
                      label="เพิ่มไซส์ใหญ่ (3XL+)"
                      value={`+ ${formatBaht(order.sizeSurcharge)}`}
                    />
                  )}
                </>
              )}
              {(order.dealerDiscount ?? 0) > 0 && (
                <BreakdownRow
                  label="ส่วนลดตัวแทน"
                  value={`− ${formatBaht(order.dealerDiscount)}`}
                  muted
                />
              )}
              {(order.discount ?? 0) > 0 && (
                <BreakdownRow
                  label="ส่วนลด"
                  value={`− ${formatBaht(order.discount)}`}
                  muted
                />
              )}
              {(order.shipping ?? 0) > 0 && (
                <BreakdownRow
                  label="ค่าขนส่ง"
                  value={`+ ${formatBaht(order.shipping)}`}
                />
              )}
              {(order.vatAmount ?? 0) > 0 && (
                <BreakdownRow
                  label={`VAT ${(order.vatRate * 100).toFixed(0)}%`}
                  value={`+ ${formatBaht(order.vatAmount)}`}
                />
              )}
              <div className="border-t border-zinc-200 pt-2 mt-2">
                <BreakdownRow
                  label={
                    <span className="font-semibold text-ink-900">ยอดสุทธิ</span>
                  }
                  value={
                    <span className="font-bold text-brand-600">
                      {formatBaht(order.total)}
                    </span>
                  }
                />
              </div>
            </dl>
          </section>
        );
      })()}

      <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6 space-y-2 text-sm">
        <Row label="Deadline" value={formatDateTH(order.deadline)} />
        <Row
          label="กราฟฟิก"
          value={assignedGraphic?.name ?? "ยังไม่มอบหมาย"}
        />
        <Row label="หมายเหตุ" value={order.notes ?? "-"} />
        <Row label="สร้างเมื่อ" value={formatDateTH(order.createdAt)} />
        <Row label="อัปเดตล่าสุด" value={formatDateTH(order.updatedAt)} />
      </section>

      {dealer && (
        <section className="card p-5 mb-6 bg-brand-50/40 border-brand-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-zinc-500">ผ่านตัวแทนจำหน่าย</p>
              <Link
                href={`/dealers/${dealer.id}`}
                className="text-lg font-semibold text-ink-900 hover:text-brand-600"
              >
                {dealer.name}
              </Link>
              <p className="text-xs text-zinc-500 mt-0.5">
                Discount {dealer.discountPct}% · Commission {dealer.commissionPct}%
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-right">
                <p className="text-xs text-zinc-500">ส่วนลดตัวแทน</p>
                <p className="font-semibold tabular-nums text-ink-900">
                  -{formatBaht(order.dealerDiscount ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Commission</p>
                <p className="font-semibold tabular-nums text-amber-700">
                  {formatBaht(order.dealerCommission ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg border border-zinc-200 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 text-sm">รายการสินค้า</h2>
          <span className="text-xs text-zinc-500">{items.length} รายการ</span>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            ยังไม่มีรายการ — เพิ่มด้านล่าง
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">ประเภท</th>
                  <th className="text-left px-5 py-2 font-medium">ไซส์</th>
                  <th className="text-right px-5 py-2 font-medium">จำนวน</th>
                  <th className="text-right px-5 py-2 font-medium">ราคา/ตัว</th>
                  <th className="text-right px-5 py-2 font-medium">รวม</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const lines = expandSizeLines(it);
                  const itemTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
                  return (
                  <tr key={it.id} className="border-t border-zinc-100 align-top">
                    <td className="px-5 py-3">
                      {it.garmentType}
                      {it.collar && (
                        <p className="text-xs text-brand-600 mt-0.5">
                          คอ: {it.collar}
                        </p>
                      )}
                      {it.note && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {it.note}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {lines.length === 1 && lines[0].size === null ? (
                        <span className="text-zinc-400">-</span>
                      ) : (
                        <ul className="space-y-1">
                          {lines.map((l, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-1.5 text-zinc-700"
                            >
                              <span className="font-medium tabular-nums">
                                {l.size}
                              </span>
                              {l.surcharge > 0 && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                                  +{l.surcharge}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <ul className="space-y-1">
                        {lines.map((l, i) => (
                          <li key={i}>{l.qty}</li>
                        ))}
                        {lines.length > 1 && (
                          <li className="border-t border-zinc-200 pt-1 font-semibold">
                            {it.qty}
                          </li>
                        )}
                      </ul>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <ul className="space-y-1">
                        {lines.map((l, i) => (
                          <li key={i}>{formatBaht(l.unitPrice)}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <ul className="space-y-1">
                        {lines.map((l, i) => (
                          <li key={i} className="text-zinc-700">
                            {formatBaht(l.lineTotal)}
                          </li>
                        ))}
                        {lines.length > 1 && (
                          <li className="border-t border-zinc-200 pt-1 font-semibold text-ink-900">
                            {formatBaht(itemTotal)}
                          </li>
                        )}
                      </ul>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteItem(it.id, id);
                        }}
                      >
                        <ConfirmButton
                          message="ลบรายการนี้?"
                          className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          ลบ
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <AddItemForm orderId={id} />
      </section>

      <AttachmentsSection orderId={id} canManage={canEdit} />

      <DesignSection orderId={id} />

      <MaterialUsageSection orderId={id} canUse={canUseMaterial} />

      {stages.length > 0 && (
        <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6">
          <h2 className="font-semibold text-zinc-900 text-sm mb-4">
            สถานะการผลิต
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto">
            {stages.map((s) => (
              <div
                key={s.id}
                className={`flex-1 min-w-20 rounded-lg p-3 text-center text-sm ${
                  s.status === "done"
                    ? "bg-emerald-50 text-emerald-700"
                    : s.status === "active"
                      ? "bg-amber-50 text-amber-700 ring-2 ring-amber-300"
                      : "bg-zinc-50 text-zinc-400"
                }`}
              >
                <div className="text-lg">{stageEmoji[s.stage]}</div>
                <div className="text-xs font-medium mt-1">
                  {stageLabels[s.stage]}
                </div>
                <div className="text-[10px] mt-0.5">
                  {s.status === "done"
                    ? "เสร็จ"
                    : s.status === "active"
                      ? "กำลังทำ"
                      : "รอ"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-zinc-900 text-sm">การชำระเงิน</h2>
          {canRecordPayment && balance > 0 && order.status !== "cancelled" && (
            <PaymentForm orderId={id} balance={balance} />
          )}
        </div>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">
            ยังไม่มีการชำระ
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">วันที่</th>
                <th className="text-left px-3 py-2 font-medium">วิธี</th>
                <th className="text-left px-3 py-2 font-medium">หมายเหตุ</th>
                <th className="text-right px-3 py-2 font-medium">ยอด</th>
              </tr>
            </thead>
            <tbody>
              {paymentRows.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-600">
                    {formatDateTH(p.receivedAt)}
                  </td>
                  <td className="px-3 py-2">
                    {methodLabel(p.method as string)}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{p.note ?? "-"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
                    {formatBaht(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {canChangeStatus && (
      <section className="bg-white rounded-lg border border-zinc-200 p-5 mb-6">
        <h2 className="font-semibold text-zinc-900 text-sm mb-3">
          เปลี่ยนสถานะ
        </h2>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-zinc-500">
            สถานะ &quot;
            {statusLabels[order.status as keyof typeof statusLabels]}
            &quot; เป็นสถานะปลายทาง เปลี่ยนต่อไม่ได้
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => {
              const bound = updateOrderStatus.bind(null, id, s);
              return (
                <form key={s} action={bound}>
                  <button
                    type="submit"
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      s === "cancelled"
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    → {statusLabels[s]}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      )}

      {canDelete && (
      <section className="bg-white rounded-lg border border-red-200 p-5">
        <h2 className="font-semibold text-red-900 text-sm mb-2">โซนอันตราย</h2>
        <p className="text-xs text-zinc-500 mb-3">
          ลบออเดอร์จะลบรายการสินค้า ใบแจ้งหนี้ และสเตจการผลิตทั้งหมด
        </p>
        <form
          action={async () => {
            "use server";
            await deleteOrder(id);
          }}
        >
          <ConfirmButton
            message="แน่ใจหรือไม่ว่าต้องการลบออเดอร์นี้? การกระทำนี้ย้อนกลับไม่ได้"
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
          >
            ลบออเดอร์นี้
          </ConfirmButton>
        </form>
      </section>
      )}
    </div>
  );
}

function methodLabel(m: string): string {
  return (
    {
      cash: "เงินสด",
      transfer: "โอน",
      promptpay: "พร้อมเพย์",
      credit_card: "บัตรเครดิต",
      other: "อื่น ๆ",
    }[m] ?? m
  );
}

type SizeLine = {
  size: string | null;
  qty: number;
  unitPrice: number;
  surcharge: number;
  lineTotal: number;
};

function expandSizeLines(it: {
  qty: number;
  unitPrice: number | null;
  sizeBreakdown: string | null;
}): SizeLine[] {
  const base = it.unitPrice ?? 0;
  if (!it.sizeBreakdown) {
    return [
      { size: null, qty: it.qty, unitPrice: base, surcharge: 0, lineTotal: base * it.qty },
    ];
  }
  try {
    const obj = JSON.parse(it.sizeBreakdown) as Record<string, number>;
    const entries = Object.entries(obj).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      return [
        { size: null, qty: it.qty, unitPrice: base, surcharge: 0, lineTotal: base * it.qty },
      ];
    }
    return entries.map(([size, qty]) => {
      const surcharge = (BIG_SIZES as readonly string[]).includes(size)
        ? BIG_SIZE_SURCHARGE
        : 0;
      const unitPrice = base + surcharge;
      return { size, qty, unitPrice, surcharge, lineTotal: unitPrice * qty };
    });
  } catch {
    return [
      { size: null, qty: it.qty, unitPrice: base, surcharge: 0, lineTotal: base * it.qty },
    ];
  }
}

function formatSizeBreakdown(s: string | null | undefined): string {
  if (!s) return "-";
  try {
    const obj = JSON.parse(s) as Record<string, number>;
    const entries = Object.entries(obj)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`);
    return entries.length > 0 ? entries.join(" ") : "-";
  } catch {
    return "-";
  }
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200"
      }`}
    >
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`text-lg md:text-xl font-semibold mt-0.5 tabular-nums ${
          highlight ? "text-amber-900" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-28 text-zinc-500 flex-shrink-0">{label}</span>
      <span className="flex-1 text-zinc-900 break-words">{value}</span>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  muted,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between text-sm ${muted ? "text-zinc-600" : "text-zinc-900"}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
