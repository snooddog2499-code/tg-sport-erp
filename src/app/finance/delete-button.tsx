"use client";

import { useActionState, useTransition } from "react";
import { deleteTransaction, type TxnFormState } from "@/actions/transactions";
import { Trash2 } from "lucide-react";

const initial: TxnFormState = {};

export default function DeleteButton({ id }: { id: number }) {
  const [, action, pending] = useActionState(deleteTransaction, initial);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!confirm("ลบรายการนี้?\nการลบจะส่งผลต่อยอดสรุปประจำเดือน")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    startTransition(() => action(fd));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-zinc-400 hover:text-red-600 disabled:opacity-50 transition-colors p-1"
      title="ลบรายการ"
    >
      <Trash2 size={14} />
    </button>
  );
}
