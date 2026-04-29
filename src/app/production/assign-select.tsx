"use client";

import { useTransition } from "react";
import { assignStage } from "@/actions/production";

export default function AssignSelect({
  stageId,
  currentUserId,
  users,
}: {
  stageId: number;
  currentUserId: number | null;
  users: Array<{ id: number; name: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentUserId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.currentTarget.value;
        const userId = v ? parseInt(v, 10) : null;
        startTransition(async () => {
          await assignStage(stageId, userId);
        });
      }}
      className="w-full text-xs border border-zinc-200 rounded px-2 py-1 disabled:opacity-50"
    >
      <option value="">-- ยังไม่มอบหมาย --</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
