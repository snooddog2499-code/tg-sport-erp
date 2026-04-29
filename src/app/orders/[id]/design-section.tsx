import { listDesigns, deleteDesign, updateDesignStatus } from "@/actions/designs";
import { formatDateTH } from "@/lib/format";
import { inferMimeFromUrl, isImageMime } from "@/lib/uploads";
import { FileText, ImageIcon, Download, Trash2 } from "lucide-react";
import ConfirmButton from "./confirm-button";
import DesignUploadForm from "./design-upload-form";
import CopyLinkButton from "./copy-link-button";

const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  sent: "ส่งให้ลูกค้าแล้ว",
  approved: "ลูกค้าอนุมัติ",
  revision: "แก้ไข",
};

const statusColor: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  sent: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  revision: "bg-amber-100 text-amber-700",
};

const nextStatuses: Record<string, Array<"sent" | "approved" | "revision">> = {
  draft: ["sent"],
  sent: ["approved", "revision"],
  revision: ["sent"],
  approved: [],
};

export default async function DesignSection({ orderId }: { orderId: number }) {
  const designs = await listDesigns(orderId);

  return (
    <section className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900 text-sm">
            ไฟล์ออกแบบ
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {designs.length} เวอร์ชัน — อัปโหลดใหม่เพื่อสร้างเวอร์ชันถัดไป
          </p>
        </div>
      </div>

      {designs.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          ยังไม่มีไฟล์ออกแบบ
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {designs.map((d) => {
            const mime = d.fileUrl ? inferMimeFromUrl(d.fileUrl) : "";
            const isImg = isImageMime(mime);
            const flows = nextStatuses[d.status] ?? [];
            return (
              <li
                key={d.id}
                className="px-5 py-4 flex items-start gap-4 hover:bg-zinc-50/50"
              >
                <div className="w-20 h-20 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isImg && d.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.fileUrl}
                      alt={`v${d.version}`}
                      className="w-full h-full object-cover"
                    />
                  ) : mime === "application/pdf" ? (
                    <FileText size={28} className="text-red-500" />
                  ) : (
                    <ImageIcon size={28} className="text-zinc-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-ink-900">
                      v{d.version}
                    </span>
                    <span
                      className={`badge-plain ${statusColor[d.status] ?? ""}`}
                    >
                      {statusLabel[d.status] ?? d.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatDateTH(d.createdAt)}
                    </span>
                  </div>
                  {d.note && (
                    <p className="text-xs text-zinc-600 mt-1.5">{d.note}</p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {d.fileUrl && (
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-xs"
                      >
                        <Download size={11} />
                        เปิดไฟล์
                      </a>
                    )}
                    {d.approvalToken &&
                      (d.status === "sent" || d.status === "revision") && (
                        <CopyLinkButton token={d.approvalToken} />
                      )}
                    {flows.map((next) => {
                      const label =
                        next === "sent"
                          ? "ส่งให้ลูกค้า"
                          : next === "approved"
                            ? "ลูกค้าอนุมัติ"
                            : "ขอให้แก้";
                      const toneClass =
                        next === "approved"
                          ? "btn-brand"
                          : next === "revision"
                            ? "btn-outline"
                            : "btn-primary";
                      return (
                        <form
                          key={next}
                          action={async () => {
                            "use server";
                            await updateDesignStatus(d.id, next);
                          }}
                        >
                          <button
                            type="submit"
                            className={`btn ${toneClass} btn-xs`}
                          >
                            → {label}
                          </button>
                        </form>
                      );
                    })}
                    <form
                      action={async () => {
                        "use server";
                        await deleteDesign(d.id);
                      }}
                    >
                      <ConfirmButton
                        message={`ลบ v${d.version}?`}
                        className="btn btn-ghost btn-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={11} />
                        ลบ
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100">
        <DesignUploadForm orderId={orderId} />
      </div>
    </section>
  );
}
