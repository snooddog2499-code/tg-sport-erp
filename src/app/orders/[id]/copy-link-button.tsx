"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/approve/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("คัดลอกลิงก์นี้:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-outline btn-xs"
    >
      {copied ? (
        <>
          <Check size={11} strokeWidth={2.5} className="text-emerald-600" />
          คัดลอกแล้ว
        </>
      ) : (
        <>
          <Link2 size={11} />
          คัดลอกลิงก์ลูกค้า
        </>
      )}
    </button>
  );
}
