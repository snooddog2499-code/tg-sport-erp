import {
  Crown,
  ShieldCheck,
  BriefcaseBusiness,
  Palette,
  Printer,
  Flame,
  Scissors,
  Shirt,
  CheckCircle2,
  Store,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const roleIcon: Record<string, LucideIcon> = {
  owner: Crown,
  manager: BriefcaseBusiness,
  admin: ShieldCheck,
  graphic: Palette,
  print: Printer,
  roll: Flame,
  laser: Scissors,
  sew: Shirt,
  qc: CheckCircle2,
  dealer: Store,
};

const roleStyle: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  manager: "bg-purple-100 text-purple-700",
  admin: "bg-sky-100 text-sky-700",
  graphic: "bg-pink-100 text-pink-700",
  print: "bg-blue-100 text-blue-700",
  roll: "bg-orange-100 text-orange-700",
  laser: "bg-indigo-100 text-indigo-700",
  sew: "bg-teal-100 text-teal-700",
  qc: "bg-emerald-100 text-emerald-700",
  dealer: "bg-zinc-100 text-zinc-700",
};

const sizeMap = {
  xs: { box: "w-5 h-5", icon: 11 },
  sm: { box: "w-7 h-7", icon: 14 },
  md: { box: "w-8 h-8", icon: 16 },
  lg: { box: "w-10 h-10", icon: 18 },
};

export default function RoleAvatar({
  role,
  size = "md",
  className = "",
}: {
  role: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = roleIcon[role] ?? User;
  const style = roleStyle[role] ?? "bg-zinc-100 text-zinc-600";
  const dim = sizeMap[size];

  return (
    <div
      className={`${dim.box} rounded-full flex items-center justify-center flex-shrink-0 ${style} ${className}`}
    >
      <Icon size={dim.icon} strokeWidth={2.25} />
    </div>
  );
}
