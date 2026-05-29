"use client";

import { useState, useTransition } from "react";
import {
  toggleUserMenuAccess,
  resetUserMenuAccess,
} from "@/actions/menu-access";
import { MENU_ITEMS } from "@/lib/menu-access-types";
import { Check, RefreshCw, Loader2 } from "lucide-react";
import RoleAvatar from "@/components/RoleAvatar";

type UserInfo = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  active: boolean;
};

export default function UserPermissionsRow({
  user,
  allowedKeys,
  hasOverrides,
}: {
  user: UserInfo;
  allowedKeys: string[];
  hasOverrides: boolean;
}) {
  const [resetting, startResetTransition] = useTransition();
  const [allowed, setAllowed] = useState(new Set(allowedKeys));
  const [overridden, setOverridden] = useState(hasOverrides);
  // Per-checkbox pending state so clicking one cell doesn't freeze the
  // other cells in the same row. Each key in this set is mid-flight.
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const toggle = async (menuKey: string) => {
    // Ignore re-clicks while this exact cell is mid-flight
    if (pendingKeys.has(menuKey)) return;

    const isAllowed = allowed.has(menuKey);
    // Optimistic update — flip immediately so the UI feels instant
    const optimistic = new Set(allowed);
    if (isAllowed) optimistic.delete(menuKey);
    else optimistic.add(menuKey);
    setAllowed(optimistic);
    setOverridden(true);
    setPendingKeys((prev) => {
      const next = new Set(prev);
      next.add(menuKey);
      return next;
    });
    setError(null);

    const fd = new FormData();
    fd.set("userId", String(user.id));
    fd.set("menuKey", menuKey);
    fd.set("allowed", isAllowed ? "false" : "true");

    try {
      await toggleUserMenuAccess(fd);
    } catch (e) {
      // Roll back the optimistic flip if the server rejected the toggle
      const reverted = new Set(allowed);
      setAllowed(reverted);
      setError(
        e instanceof Error
          ? e.message
          : "บันทึกไม่สำเร็จ ลองกดอีกครั้ง"
      );
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(menuKey);
        return next;
      });
    }
  };

  const handleReset = () => {
    if (!confirm(`คืนค่าสิทธิ์ของ ${user.name} ตามบทบาท ${user.roleLabel}?`))
      return;
    startResetTransition(async () => {
      try {
        await resetUserMenuAccess(user.id);
        setOverridden(false);
        setError(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "รีเซ็ตไม่สำเร็จ"
        );
      }
    });
  };

  return (
    <tr className="border-t border-zinc-100 hover:bg-zinc-50/50">
      <td className="px-4 py-3 sticky left-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <RoleAvatar role={user.role} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">
              {user.name}
              {!user.active && (
                <span className="ml-1.5 text-[10px] text-zinc-400">
                  (พ้นสภาพ)
                </span>
              )}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {user.roleLabel} · {user.email}
            </p>
            {error && (
              <p className="text-[10px] text-red-600 mt-0.5" role="alert">
                {error}
              </p>
            )}
          </div>
          {overridden && (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="text-[11px] text-zinc-500 hover:text-brand-600 inline-flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
              title="คืนค่าตามบทบาท"
            >
              {resetting ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <RefreshCw size={11} />
              )}
            </button>
          )}
        </div>
      </td>
      {MENU_ITEMS.map((item) => {
        const isOn = allowed.has(item.key);
        const isPending = pendingKeys.has(item.key);
        return (
          <td key={item.key} className="px-3 py-3 text-center">
            <button
              type="button"
              onClick={() => toggle(item.key)}
              // Only the cell currently saving is disabled; other cells
              // remain clickable so toggling many menus in a row is fast.
              disabled={isPending}
              aria-label={`${user.name} - ${item.label}`}
              aria-pressed={isOn}
              className={`w-7 h-7 rounded-md border-2 transition-all inline-flex items-center justify-center ${
                isOn
                  ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-white border-zinc-300 text-transparent hover:border-zinc-400"
              } ${isPending ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
            >
              {isPending ? (
                <Loader2
                  size={12}
                  strokeWidth={3}
                  className={`animate-spin ${
                    isOn ? "text-white" : "text-zinc-400"
                  }`}
                />
              ) : (
                <Check size={14} strokeWidth={3} />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
