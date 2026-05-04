"use client";

import { useActionState, useTransition } from "react";
import { deleteWithdrawal, type WithdrawFormState } from "@/actions/withdrawals";
import { Trash2 } from "lucide-react";

const initial: WithdrawFormState = {};

export default function DeleteButton({ id }: { id: number }) {
  const [, action, pending] = useActionState(deleteWithdrawal, initial);
  const [, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "ยืนยันลบรายการเบิกนี้?\nสต็อกจะถูกคืนกลับเข้าคลังอัตโนมัติ"
      )
    )
      return;
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
      title="ลบ + คืนสต็อก"
    >
      <Trash2 size={14} />
    </button>
  );
}
