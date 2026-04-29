import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatDateTH } from "@/lib/format";
import { inferMimeFromUrl, isImageMime } from "@/lib/uploads";
import { FileText, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import DecisionForm from "./form";

export const metadata = {
  title: "อนุมัติลายออกแบบ — TG Sport",
};

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const [row] = await db
    .select({
      id: schema.designs.id,
      version: schema.designs.version,
      fileUrl: schema.designs.fileUrl,
      status: schema.designs.status,
      note: schema.designs.note,
      sentAt: schema.designs.sentAt,
      approvedAt: schema.designs.approvedAt,
      orderCode: schema.orders.code,
      customerName: schema.customers.name,
    })
    .from(schema.designs)
    .leftJoin(schema.orders, eq(schema.designs.orderId, schema.orders.id))
    .leftJoin(
      schema.customers,
      eq(schema.orders.customerId, schema.customers.id)
    )
    .where(eq(schema.designs.approvalToken, token))
    .limit(1);

  if (!row) notFound();

  const mime = row.fileUrl ? inferMimeFromUrl(row.fileUrl) : "";
  const isImg = isImageMime(mime);
  const isApproved = row.status === "approved";

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-ink-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-600/30">
            T
          </div>
          <div>
            <h1 className="font-semibold text-sm">TG Sport</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
              ยืนยันลายออกแบบ
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="card p-5 md:p-6 mb-4">
          <p className="text-sm text-zinc-500 mb-1">
            สวัสดีคุณ{" "}
            <span className="text-ink-900 font-medium">
              {row.customerName ?? "ลูกค้า"}
            </span>
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-ink-900">
            กรุณาตรวจและอนุมัติลาย
          </h2>
          <p className="text-sm text-zinc-600 mt-2">
            ออเดอร์ <span className="font-mono">{row.orderCode}</span> · เวอร์ชัน{" "}
            <span className="font-mono">v{row.version}</span>
          </p>
          {row.sentAt && (
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
              <Calendar size={12} />
              ส่งเมื่อ {formatDateTH(row.sentAt)}
            </p>
          )}
        </div>

        <div className="card overflow-hidden mb-4">
          <div className="bg-zinc-50 border-b border-zinc-100 px-5 py-3">
            <p className="text-xs font-medium text-zinc-700">ลายออกแบบ</p>
          </div>
          {isImg && row.fileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.fileUrl}
              alt={`Design v${row.version}`}
              className="w-full h-auto"
            />
          ) : row.fileUrl ? (
            <div className="p-8 text-center">
              <FileText size={48} className="mx-auto text-red-500 mb-3" />
              <a
                href={row.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                เปิดไฟล์ PDF
              </a>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400">ไม่พบไฟล์</div>
          )}
          {row.note && (
            <div className="px-5 py-3 border-t border-zinc-100 bg-amber-50/40">
              <p className="text-xs text-zinc-700 whitespace-pre-line">
                <span className="font-medium">หมายเหตุจากทีมงาน:</span>{" "}
                {row.note}
              </p>
            </div>
          )}
        </div>

        {isApproved ? (
          <div className="card p-6 text-center bg-emerald-50 border-emerald-200">
            <CheckCircle2
              size={40}
              className="mx-auto text-emerald-600 mb-2"
            />
            <h3 className="font-semibold text-emerald-900">
              ลายนี้อนุมัติแล้ว
            </h3>
            <p className="text-xs text-emerald-700 mt-1">
              เมื่อ {formatDateTH(row.approvedAt)} — ทีมงานจะเริ่มผลิตต่อไป
            </p>
          </div>
        ) : (
          <div className="card p-5 md:p-6">
            <h3 className="font-semibold text-ink-900 text-sm mb-1">
              การตัดสินใจของคุณ
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              หากอนุมัติ ทีมงานจะเริ่มผลิตทันที · หากขอแก้ ทีมจะปรับลายและส่งให้ใหม่
            </p>
            <DecisionForm token={token} />
          </div>
        )}

        <div className="flex items-start gap-2 mt-6 p-3 bg-blue-50 rounded-md text-xs text-blue-900">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            ลิงก์นี้เป็นลิงก์ส่วนตัวสำหรับออเดอร์ของคุณ กรุณาอย่าเผยแพร่ต่อผู้อื่น
          </span>
        </div>
      </main>
    </div>
  );
}
