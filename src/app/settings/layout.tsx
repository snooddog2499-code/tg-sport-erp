import Link from "next/link";
import { requirePerm } from "@/lib/permissions";
import SettingsTabs from "./settings-tabs";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePerm("settings:manage");
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <SettingsTabs />
      {children}
    </div>
  );
}

void Link;
