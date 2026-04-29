"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ShieldCheck } from "lucide-react";

const tabs = [
  { href: "/settings/users", label: "ผู้ใช้งาน", icon: Users },
  {
    href: "/settings/permissions",
    label: "สิทธิ์การเห็นเมนู",
    icon: ShieldCheck,
  },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 border-b border-zinc-200 flex items-end gap-1">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 transition-colors -mb-px ${
              active
                ? "border-brand-500 text-ink-900 font-semibold"
                : "border-transparent text-zinc-500 hover:text-ink-900"
            }`}
          >
            <Icon size={15} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
