"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { uploadDesign, type DesignFormState } from "@/actions/designs";
import { Upload, AlertCircle, Paperclip } from "lucide-react";

const initial: DesignFormState = {};

export default function DesignUploadForm({ orderId }: { orderId: number }) {
  const bound = uploadDesign.bind(null, orderId);
  const [state, action, pending] = useActionState(bound, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
      setFileName(null);
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="space-y-3" id="design-upload-form">
      <div>
        <label
          htmlFor="design-file"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          ไฟล์ออกแบบ (JPG, PNG, WEBP, GIF, PDF — สูงสุด 15 MB)
        </label>
        <div className="flex items-center gap-2">
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Paperclip size={13} />
            เลือกไฟล์
            <input
              id="design-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <span className="text-xs text-zinc-500 truncate flex-1 min-w-0">
            {fileName ?? "ยังไม่ได้เลือก"}
          </span>
        </div>
        {state.errors?.file && (
          <p className="text-xs text-red-600 mt-1.5">{state.errors.file[0]}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="design-note"
          className="block text-xs font-medium text-zinc-700 mb-1.5"
        >
          หมายเหตุ (ไม่บังคับ)
        </label>
        <input
          id="design-note"
          name="note"
          type="text"
          className="input"
          placeholder="เช่น ปรับโลโก้ให้ใหญ่ขึ้น"
        />
      </div>

      {state.message && !state.errors && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {state.message}
        </div>
      )}
      {state.errors && !state.errors.file && state.message && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-brand btn-sm"
      >
        <Upload size={13} strokeWidth={2.5} />
        {pending ? "กำลังอัปโหลด..." : "อัปโหลด"}
      </button>
    </form>
  );
}
