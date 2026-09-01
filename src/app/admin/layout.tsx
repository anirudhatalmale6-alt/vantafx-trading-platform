import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const unread = await db.chatThread.count({ where: { unreadForAdmin: { gt: 0 } } });

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        homeHref="/admin"
        userLabel={`${admin.firstName} ${admin.lastName} · admin`}
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/trades", label: "Trades" },
          { href: "/admin/chat", label: "Chat", badge: unread },
          { href: "/dashboard", label: "Terminal" },
        ]}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
