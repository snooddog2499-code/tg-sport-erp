import { listOrderFiles, deleteOrderFile } from "@/actions/order-files";
import { formatDateTH } from "@/lib/format";
import { isImageMime } from "@/lib/uploads";
import {
  Paperclip,
  Download,
  Trash2,
  FileText,
  FileImage,
  File as FileIcon,
} from "lucide-react";
import ConfirmButton from "./confirm-button";
import AttachmentsUploadForm from "./attachments-upload-form";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AttachmentsSection({
  orderId,
  canManage,
}: {
  orderId: number;
  canManage: boolean;
}) {
  const files = await listOrderFiles(orderId);

  return (
    <section className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Paperclip size={15} className="text-zinc-500" />
        <div>
          <h2 className="font-semibold text-ink-900 text-sm">
            ไฟล์แนบจากลูกค้า
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {files.length} ไฟล์ · รูปอ้างอิง, โลโก้, PDF
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">
          ยังไม่มีไฟล์แนบ
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {files.map((f) => {
            const isImg = isImageMime(f.mimeType);
            return (
              <li
                key={f.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-50/50"
              >
                <div className="w-12 h-12 rounded-md border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.fileUrl}
                      alt={f.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : f.mimeType === "application/pdf" ? (
                    <FileText size={22} className="text-red-500" />
                  ) : f.mimeType.startsWith("image/") ? (
                    <FileImage size={22} className="text-sky-500" />
                  ) : (
                    <FileIcon size={22} className="text-zinc-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">
                    {f.fileName}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatBytes(f.sizeBytes)} · {formatDateTH(f.createdAt)}
                  </p>
                  {f.note && (
                    <p className="text-xs text-zinc-600 mt-0.5">{f.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={f.fileUrl}
                    download={f.fileName}
                    className="btn btn-outline btn-xs"
                  >
                    <Download size={11} />
                    ดาวน์โหลด
                  </a>
                  {canManage && (
                    <form
                      action={async () => {
                        "use server";
                        await deleteOrderFile(f.id);
                      }}
                    >
                      <ConfirmButton
                        message={`ลบไฟล์ "${f.fileName}"?`}
                        className="btn btn-ghost btn-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={11} />
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManage && (
        <div className="px-5 py-4 bg-zinc-50/60 border-t border-zinc-100">
          <AttachmentsUploadForm orderId={orderId} />
        </div>
      )}
    </section>
  );
}
