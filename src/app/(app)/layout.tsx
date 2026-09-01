import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const thread = await db.chatThread.findUnique({
    where: { userId: user.id },
    select: { unreadForUser: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        homeHref="/dashboard"
        userLabel={`${user.firstName} ${user.lastName}`.trim()}
        items={[
          { href: "/dashboard", label: "Terminal" },
          { href: "/account", label: "Account" },
          { href: "/support", label: "Support", badge: thread?.unreadForUser ?? 0 },
          ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
        ]}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
