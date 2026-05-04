"use client";

import { useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { signOrderAttachmentUpload } from "@/actions/uploads-client";
import { X, Upload, Check, AlertCircle, Loader2, Paperclip } from "lucide-react";

type UploadedFile = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

type Pending = {
  id: string; // local uuid for list keys
  name: string;
  size: number;
  mime: string;
  state: "uploading" | "done" | "error";
  progress: number; // 0-100
  url?: string;
  error?: string;
};

const ACCEPT =
  "image/*,application/pdf,.doc,.docx,.xls,.xlsx";

export default function AttachmentUploader({
  /** Hidden field name prefix; server reads "${name}Urls", "${name}Names" etc. */
  name = "attachment",
}: {
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pending[]>([]);

  // Server-side upload via signed URL — runs in browser, bypasses Vercel
  // function body limit. We use the anon key for the actual PUT (Supabase
  // accepts the signed token regardless of who issued it).
  async function uploadOne(file: File, id: string) {
    setItems((cur) =>
      cur.map((p) =>
        p.id === id ? { ...p, state: "uploading", progress: 5 } : p
      )
    );
    try {
      const signed = await signOrderAttachmentUpload(file.name, file.type);
      if (!signed.ok) throw new Error(signed.error);

      const { path, token, publicUrl, bucket } = signed.data;
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Mark mid-progress while we upload (Supabase JS doesn't expose
      // progress events, but XHR direct upload would; we keep it simple
      // by toggling the indicator)
      setItems((cur) =>
        cur.map((p) => (p.id === id ? { ...p, progress: 40 } : p))
      );

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);

      setItems((cur) =>
        cur.map((p) =>
          p.id === id
            ? { ...p, state: "done", progress: 100, url: publicUrl }
            : p
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ";
      setItems((cur) =>
        cur.map((p) =>
          p.id === id ? { ...p, state: "error", progress: 0, error: msg } : p
        )
      );
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const queue: Pending[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      mime: f.type,
      state: "uploading",
      progress: 0,
    }));
    setItems((cur) => [...cur, ...queue]);
    queue.forEach((q, i) => {
      uploadOne(files[i], q.id);
    });
    // Reset input so picking the same file twice still triggers change
    e.target.value = "";
  }

  function removeItem(id: string) {
    setItems((cur) => cur.filter((p) => p.id !== id));
  }

  const done = items.filter((p): p is Pending & { url: string } =>
    p.state === "done" && !!p.url
  );
  const anyUploading = items.some((p) => p.state === "uploading");

  return (
    <div className="space-y-2">
      <label
        className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-md cursor-pointer text-sm transition-colors ${
          anyUploading
            ? "border-zinc-300 bg-zinc-50 text-zinc-500"
            : "border-zinc-300 bg-white hover:border-brand-400 hover:bg-brand-50/30 text-zinc-700"
        }`}
      >
        <Paperclip size={16} />
        <span>{anyUploading ? "กำลังอัปโหลด..." : "เลือกไฟล์ (กดเพิ่มได้เรื่อย ๆ)"}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </label>

      {/* Hidden inputs that the server action reads */}
      {done.map((p) => (
        <span key={p.id} className="hidden">
          <input type="hidden" name={`${name}Urls`} value={p.url} />
          <input type="hidden" name={`${name}Names`} value={p.name} />
          <input type="hidden" name={`${name}Mimes`} value={p.mime} />
          <input type="hidden" name={`${name}Sizes`} value={p.size} />
        </span>
      ))}

      {items.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-md text-xs"
            >
              <FileIcon state={p.state} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-800 truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap tabular-nums">
                    {(p.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {p.state === "uploading" && (
                  <div className="h-1 bg-zinc-200 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                )}
                {p.state === "error" && (
                  <p className="text-red-600 mt-0.5">{p.error}</p>
                )}
                {p.state === "done" && (
                  <p className="text-emerald-600 mt-0.5">อัปโหลดสำเร็จ</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(p.id)}
                className="text-zinc-400 hover:text-red-600 p-1"
                aria-label="ลบไฟล์"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-zinc-500 mt-1">
        อัปโหลดตรงสู่ Supabase Storage · ไม่จำกัดขนาด · รองรับรูป, PDF, Word,
        Excel
      </p>
    </div>
  );
}

function FileIcon({ state }: { state: Pending["state"] }) {
  if (state === "uploading")
    return (
      <Loader2 size={14} className="text-brand-500 animate-spin flex-shrink-0" />
    );
  if (state === "done")
    return <Check size={14} className="text-emerald-600 flex-shrink-0" />;
  if (state === "error")
    return <AlertCircle size={14} className="text-red-600 flex-shrink-0" />;
  return <Upload size={14} className="text-zinc-400 flex-shrink-0" />;
}
