"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  uploadOrderFiles,
  type OrderFileFormState,
} from "@/actions/order-files";
import { Paperclip, Upload, AlertCircle } from "lucide-react";

const initial: OrderFileFormState = {};

export default function AttachmentsUploadForm({
  orderId,
}: {
  orderId: number;
}) {
  const bound = uploadOrderFiles.bind(null, orderId);
  const [state, action, pending] = useActionState(bound, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  useEffect(() => {
    if (state.message && !state.errors && !pending && formRef.current) {
      formRef.current.reset();
      setFileNames([]);
    }
  }, [state, pending]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3"
      id={`order-files-form-${orderId}`}
    >
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          เพิ่มไฟล์ (เลือกได้หลายไฟล์)
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Paperclip size={13} />
            เลือกไฟล์
            <input
              name="files"
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) =>
                setFileNames(
                  Array.from(e.target.files ?? []).map((f) => f.name)
                )
              }
            />
          </label>
          <span className="text-xs text-zinc-500 truncate flex-1 min-w-0">
            {fileNames.length === 0
              ? "ยังไม่ได้เลือก"
              : fileNames.length === 1
                ? fileNames[0]
                : `${fileNames.length} ไฟล์`}
          </span>
        </div>
        {state.errors?.files && (
          <p className="text-xs text-red-600 mt-1.5">{state.errors.files[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
          หมายเหตุ (ไม่บังคับ)
        </label>
        <input
          name="note"
          type="text"
          className="input"
          placeholder="เช่น โลโก้ทีม, ลายเก่า"
        />
      </div>

      {state.message && !state.errors && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          {state.message}
        </div>
      )}
      {state.errors && !state.errors.files && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>กรุณาตรวจข้อมูลอีกครั้ง</span>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-brand btn-sm">
        <Upload size={13} strokeWidth={2.5} />
        {pending ? "กำลังอัปโหลด..." : "อัปโหลด"}
      </button>
    </form>
  );
}
