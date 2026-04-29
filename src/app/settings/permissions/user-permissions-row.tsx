"use client";

import { useState, useTransition } from "react";
import {
  toggleUserMenuAccess,
  resetUserMenuAccess,
} from "@/actions/menu-access";
import { MENU_ITEMS } from "@/lib/menu-access-types";
import { Check, RefreshCw } from "lucide-react";
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
  const [pending, startTransition] = useTransition();
  const [allowed, setAllowed] = useState(new Set(allowedKeys));
  const [overridden, setOverridden] = useState(hasOverrides);

  const toggle = (menuKey: string) => {
    const isAllowed = allowed.has(menuKey);
    const next = new Set(allowed);
    if (isAllowed) next.delete(menuKey);
    else next.add(menuKey);
    setAllowed(next);
    setOverridden(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", String(user.id));
      fd.set("menuKey", menuKey);
      fd.set("allowed", isAllowed ? "false" : "true");
      await toggleUserMenuAccess(fd);
    });
  };

  const handleReset = () => {
    if (!confirm(`คืนค่าสิทธิ์ของ ${user.name} ตามบทบาท ${user.roleLabel}?`))
      return;
    startTransition(async () => {
      await resetUserMenuAccess(user.id);
      // After reset, the page will re-render with default keys
      setOverridden(false);
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
          </div>
          {overridden && (
            <button
              type="button"
              onClick={handleReset}
              disabled={pending}
              className="text-[11px] text-zinc-500 hover:text-brand-600 inline-flex items-center gap-1 flex-shrink-0"
              title="คืนค่าตามบทบาท"
            >
              <RefreshCw size={11} />
            </button>
          )}
        </div>
      </td>
      {MENU_ITEMS.map((item) => {
        const isOn = allowed.has(item.key);
        return (
          <td key={item.key} className="px-3 py-3 text-center">
            <button
              type="button"
              onClick={() => toggle(item.key)}
              disabled={pending}
              aria-label={`${user.name} - ${item.label}`}
              className={`w-7 h-7 rounded-md border-2 transition-all inline-flex items-center justify-center disabled:opacity-50 ${
                isOn
                  ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-white border-zinc-300 text-transparent hover:border-zinc-400"
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </button>
          </td>
        );
      })}
    </tr>
  );
}
