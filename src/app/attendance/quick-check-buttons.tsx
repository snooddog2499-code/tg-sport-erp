"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  checkInWithPhoto,
  type CheckInState,
} from "@/actions/attendance";
import { LogIn, LogOut, Camera, X, Loader2, Check } from "lucide-react";

const initial: CheckInState = {};

export default function QuickCheckButtons({
  employeeId,
  hasCheckIn,
  hasCheckOut,
}: {
  employeeId: number;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
}) {
  const [open, setOpen] = useState<null | "in" | "out">(null);

  return (
    <>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen("in")}
          disabled={hasCheckIn}
          className="btn btn-outline btn-xs disabled:opacity-40"
        >
          <LogIn size={11} strokeWidth={2.5} />
          เข้า
        </button>
        <button
          type="button"
          onClick={() => setOpen("out")}
          disabled={hasCheckOut}
          className="btn btn-primary btn-xs disabled:opacity-40"
        >
          <LogOut size={11} strokeWidth={2.5} />
          ออก
        </button>
      </div>

      {open && (
        <PhotoCaptureModal
          employeeId={employeeId}
          type={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function PhotoCaptureModal({
  employeeId,
  type,
  onClose,
}: {
  employeeId: number;
  type: "in" | "out";
  onClose: () => void;
}) {
  const bound = checkInWithPhoto.bind(null, employeeId, type);
  const [state, action, pending] = useActionState(bound, initial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => onClose(), 1200);
      return () => clearTimeout(t);
    }
  }, [state.ok, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const titleText = type === "in" ? "บันทึกเข้างาน" : "บันทึกออกงาน";
  const tone = type === "in" ? "text-emerald-700" : "text-zinc-900";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} className={tone} />
            <h3 className="font-semibold text-ink-900">{titleText}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-ink-900"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        <form ref={formRef} action={action} className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">
            กรุณาถ่ายรูปยืนยันตัวตน — ระบบจะบันทึกเวลาปัจจุบันให้อัตโนมัติ
          </p>

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="ตัวอย่าง"
              className="w-full aspect-[3/4] object-cover rounded-lg border border-zinc-200"
            />
          ) : (
            <div className="aspect-[3/4] bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center text-center px-4">
              <Camera size={36} className="text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-500">
                ยังไม่ได้ถ่ายรูป
              </p>
            </div>
          )}

          <label className="btn btn-outline btn-sm w-full cursor-pointer">
            <Camera size={14} />
            {previewUrl ? "ถ่ายใหม่" : "ถ่ายรูป"}
            <input
              name="photo"
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFileChange}
              disabled={pending}
            />
          </label>
          {fileName && (
            <p className="text-[11px] text-zinc-500 text-center truncate">
              {fileName}
            </p>
          )}

          {state.error && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
              <X size={14} className="flex-shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}
          {state.ok && state.message && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              <Check size={16} strokeWidth={2.5} />
              {state.message}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !previewUrl || state.ok}
            className={`btn w-full ${
              type === "in" ? "btn-brand" : "btn-primary"
            }`}
          >
            {pending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                {type === "in" ? <LogIn size={14} /> : <LogOut size={14} />}
                ยืนยัน{type === "in" ? "เข้างาน" : "ออกงาน"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
