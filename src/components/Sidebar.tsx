"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Factory,
  Users,
  UserPlus,
  ScrollText,
  Package,
  Clock,
  BriefcaseBusiness,
  BarChart3,
  Store,
  Menu,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logout } from "@/actions/auth";
import RoleAvatar from "@/components/RoleAvatar";

type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { key: "home", href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { key: "orders", href: "/orders", label: "ออเดอร์", icon: ClipboardList },
  { key: "production", href: "/production", label: "การผลิต", icon: Factory },
  { key: "materials", href: "/materials", label: "วัตถุดิบ", icon: Package },
  { key: "dealers", href: "/dealers", label: "ตัวแทน", icon: Store },
  { key: "attendance", href: "/attendance", label: "ลงเวลาเข้างาน", icon: Clock },
  { key: "employees", href: "/employees", label: "พนักงาน", icon: BriefcaseBusiness },
  { key: "reports", href: "/reports", label: "รายงาน", icon: BarChart3 },
  { key: "audit", href: "/audit", label: "ประวัติการกระทำ", icon: ScrollText },
];

const roleLabels: Record<string, string> = {
  owner: "เจ้าของ",
  manager: "ผู้จัดการ",
  admin: "แอดมิน",
  graphic: "กราฟฟิก",
  print: "ช่างพิมพ์",
  roll: "ช่างรีดโรล",
  laser: "ช่างเลเซอร์",
  sew: "ช่างเย็บ",
  qc: "QC",
  dealer: "ตัวแทน",
};

const dealerNavItems: NavItem[] = [
  { key: "dealer_dashboard", href: "/dealer-portal", label: "แดชบอร์ด", icon: LayoutDashboard },
  { key: "dealer_orders", href: "/orders", label: "ออเดอร์ของฉัน", icon: ClipboardList },
  { key: "dealer_orders_new", href: "/orders/new", label: "สั่งออเดอร์ใหม่", icon: PlusCircle },
];

type SidebarUser = {
  id: number;
  name: string;
  role: string;
  email: string;
};

export default function Sidebar({
  user,
  visibleMenuKeys,
  canManageSettings,
}: {
  user: SidebarUser;
  visibleMenuKeys: string[];
  canManageSettings: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-ink-950 text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 hover:bg-white/10 rounded-md"
          aria-label="เปิดเมนู"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="text-sm font-semibold tracking-wide">TG Sport</span>
        </div>
        <div className="w-8" />
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static top-0 left-0 z-50 h-full md:h-screen md:sticky md:top-0 w-64 md:w-60 flex flex-col bg-ink-950 text-zinc-300 transition-transform md:transition-none`}
      >
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                TG Sport
              </h1>
              <p className="text-[10px] text-zinc-500 leading-tight tracking-wider uppercase">
                ERP · กาฬสินธุ์
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-zinc-400 hover:text-white"
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {(user.role === "dealer" ? dealerNavItems : navItems)
            .filter(
              (item) =>
                user.role === "dealer" || visibleMenuKeys.includes(item.key)
            )
            .map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
                  )}
                  <Icon
                    size={17}
                    className={active ? "text-brand-400" : ""}
                    strokeWidth={2}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          {canManageSettings && (
            <Link
              href="/settings/permissions"
              onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative ${
                pathname.startsWith("/settings")
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              {pathname.startsWith("/settings") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
              )}
              <Settings
                size={17}
                className={
                  pathname.startsWith("/settings") ? "text-brand-400" : ""
                }
                strokeWidth={2}
              />
              <span>ตั้งค่าผู้ใช้งาน</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-white/5">
          <div className="px-3 py-3 flex items-center gap-2.5">
            <RoleAvatar role={user.role} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {roleLabels[user.role] ?? user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={pending}
              aria-label="ออกจากระบบ"
              className="p-1.5 rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-50"
            >
              <LogOut size={15} />
            </button>
          </div>
          <div className="px-5 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
            <span>v 0.4.0</span>
            <span className="text-zinc-600">Phase 2</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-600/30">
      T
    </div>
  );
}
