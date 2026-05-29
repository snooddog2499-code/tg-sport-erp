import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatBaht, formatDateTH } from "@/lib/format";
import {
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  Paperclip,
  Calendar,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinanceDocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "finance:view")) redirect("/forbidden");

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [doc] = await db
    .select({
      d: schema.financeDocuments,
      userName: schema.users.name,
    })
    .from(schema.financeDocuments)
    .leftJoin(
      schema.users,
      eq(schema.financeDocuments.recordedBy, schema.users.id)
    )
    .where(eq(schema.financeDocuments.id, id));
  if (!doc) notFound();

  const lines = await db
    .select()
    .from(schema.financeDocumentLines)
    .where(eq(schema.financeDocumentLines.documentId, id))
    .orderBy(asc(schema.financeDocumentLines.lineNo));

  const files = await db
    .select()
    .from(schema.financeDocumentFiles)
    .where(eq(schema.financeDocumentFiles.documentId, id));

  const isIncome = doc.d.type === "income";
  const TypeIcon = isIncome ? ArrowUpCircle : ArrowDownCircle;
  const typeTone = isIncome ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/finance"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-ink-900 mb-3"
      >
        <ArrowLeft size={14} />
        รายรับ-รายจ่าย
      </Link>

      <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon size={20} strokeWidth={2} className={typeTone} />
            <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight font-mono">
              {doc.d.docNo}
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            {isIncome ? "เอกสารรายรับ" : "เอกสารรายจ่าย"} ·{" "}
            {formatDateTH(doc.d.docDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">จำนวนเงินรวมทั้งสิ้น</p>
          <p className={`text-3xl font-bold tabular-nums ${typeTone}`}>
            {isIncome ? "+" : "−"}
            {formatBaht(doc.d.total)}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">
            {isIncome ? "ผู้ชำระเงิน / ลูกค้า" : "ผู้จำหน่าย"}
          </h2>
          <p className="text-base font-medium text-ink-900">
            {doc.d.vendorName}
          </p>
          {doc.d.vendorAddress && (
            <p className="text-xs text-zinc-600 mt-1 whitespace-pre-line">
              {doc.d.vendorAddress}
            </p>
          )}
          <dl className="text-xs mt-3 space-y-1">
            {doc.d.vendorTaxId && (
              <div className="flex gap-2">
                <dt className="text-zinc-500 w-32 flex-shrink-0">
                  เลขประจำตัวผู้เสียภาษี
                </dt>
                <dd className="text-ink-900 tabular-nums">
                  {doc.d.vendorTaxId}
                </dd>
              </div>
            )}
            {doc.d.vendorBranch && (
              <div className="flex gap-2">
                <dt className="text-zinc-500 w-32 flex-shrink-0">สาขา</dt>
                <dd className="text-ink-900">{doc.d.vendorBranch}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-1.5">
            <Calendar size={14} />
            วันที่ + อ้างอิง
          </h2>
          <dl className="text-xs space-y-1.5">
            <div className="flex gap-2">
              <dt className="text-zinc-500 w-32 flex-shrink-0">วันที่</dt>
              <dd className="text-ink-900">{formatDateTH(doc.d.docDate)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500 w-32 flex-shrink-0">เครดิต</dt>
              <dd className="text-ink-900">{doc.d.creditDays} วัน</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-zinc-500 w-32 flex-shrink-0">ครบกำหนด</dt>
              <dd className="text-ink-900">{formatDateTH(doc.d.dueDate)}</dd>
            </div>
            {doc.d.referenceNo && (
              <div className="flex gap-2">
                <dt className="text-zinc-500 w-32 flex-shrink-0">
                  เลขที่อ้างอิง
                </dt>
                <dd className="text-ink-900 font-mono">
                  {doc.d.referenceNo}
                </dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-zinc-500 w-32 flex-shrink-0">บันทึกโดย</dt>
              <dd className="text-ink-900">{doc.userName ?? "-"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {doc.d.description && (
        <section className="card p-4 md:p-5 mb-6">
          <h2 className="text-xs font-medium text-zinc-500 mb-1">
            รายละเอียดเอกสาร
          </h2>
          <p className="text-sm text-ink-900">{doc.d.description}</p>
        </section>
      )}

      <section className="card overflow-hidden mb-6">
        <div className="px-4 md:px-5 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-ink-900">รายการ</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600 text-xs">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium w-10">#</th>
              <th className="text-left px-3 py-2.5 font-medium">
                รายละเอียด
              </th>
              <th className="text-right px-3 py-2.5 font-medium">จำนวน</th>
              <th className="text-right px-3 py-2.5 font-medium">
                ราคา/หน่วย
              </th>
              <th className="text-right px-3 py-2.5 font-medium">รวม</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-500 tabular-nums">
                  {l.lineNo}
                </td>
                <td className="px-3 py-2 text-ink-900">{l.description}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatBaht(l.unitPrice)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatBaht(l.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4 md:p-5 mb-6">
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-600">รวมเป็นเงิน</dt>
            <dd className="tabular-nums">{formatBaht(doc.d.subtotal)}</dd>
          </div>
          {doc.d.discountPct > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">
                ส่วนลด {doc.d.discountPct.toFixed(2)}%
              </dt>
              <dd className="tabular-nums text-zinc-600">
                −{formatBaht(doc.d.discountAmount)}
              </dd>
            </div>
          )}
          {doc.d.discountPct > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
              <dt className="text-zinc-600">ราคาหลังหักส่วนลด</dt>
              <dd className="tabular-nums">
                {formatBaht(doc.d.afterDiscount)}
              </dd>
            </div>
          )}
          {doc.d.vatEnabled && (
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">ภาษีมูลค่าเพิ่ม 7%</dt>
              <dd className="tabular-nums">+{formatBaht(doc.d.vatAmount)}</dd>
            </div>
          )}
          {doc.d.withholdingEnabled && (
            <div className="flex items-center justify-between">
              <dt className="text-zinc-600">
                หักภาษี ณ ที่จ่าย {doc.d.withholdingPct.toFixed(2)}%
              </dt>
              <dd className="tabular-nums text-zinc-600">
                −{formatBaht(doc.d.withholdingAmount)}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t-2 border-zinc-200 pt-3 mt-1">
            <dt className="font-semibold text-ink-900">
              จำนวนเงินรวมทั้งสิ้น
            </dt>
            <dd
              className={`text-xl font-bold tabular-nums ${
                isIncome ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {formatBaht(doc.d.total)}
            </dd>
          </div>
        </dl>
      </section>

      {(doc.d.notes || doc.d.internalNotes) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {doc.d.notes && (
            <div className="card p-4 md:p-5">
              <h2 className="text-xs font-medium text-zinc-500 mb-1">
                หมายเหตุ
              </h2>
              <p className="text-sm text-ink-900 whitespace-pre-line">
                {doc.d.notes}
              </p>
            </div>
          )}
          {doc.d.internalNotes && (
            <div className="card p-4 md:p-5 bg-amber-50/40">
              <h2 className="text-xs font-medium text-amber-800 mb-1">
                โน้ตภายในบริษัท
              </h2>
              <p className="text-sm text-ink-900 whitespace-pre-line">
                {doc.d.internalNotes}
              </p>
            </div>
          )}
        </section>
      )}

      {files.length > 0 && (
        <section className="card p-4 md:p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-1.5">
            <Paperclip size={14} />
            ไฟล์แนบ ({files.length})
          </h2>
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline"
                >
                  <Paperclip size={12} />
                  {f.fileName}
                  <span className="text-[10px] text-zinc-400 tabular-nums">
                    ({(f.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
