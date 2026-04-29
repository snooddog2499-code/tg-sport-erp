import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { filterMenuItemsForUser } from "@/lib/menu-access";
import { can } from "@/lib/permissions";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TG Sport ERP",
  description: "ระบบจัดการโรงงาน TG Sport — พิมพ์ลาย, เสื้อกีฬา, เสื้อองค์กร",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  let visibleMenuKeys: string[] = [];
  let canManageSettings = false;
  if (user) {
    const items = await filterMenuItemsForUser(user);
    visibleMenuKeys = items.map((m) => m.key);
    canManageSettings = can(user.role, "settings:manage");
  }

  return (
    <html lang="th" className={`h-full ${prompt.variable}`}>
      <body className="min-h-full flex flex-col md:flex-row">
        {user ? (
          <>
            <Sidebar
              user={user}
              visibleMenuKeys={visibleMenuKeys}
              canManageSettings={canManageSettings}
            />
            <main className="flex-1 overflow-auto min-w-0">{children}</main>
          </>
        ) : (
          <main className="flex-1 min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
