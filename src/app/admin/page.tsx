import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, EmptyState, Stat, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

function fmt(date: Date) {
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [users, suspended, openTrades, closedTrades, unreadThreads, realised, recentUsers, recentLog] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.trade.count({ where: { status: "OPEN" } }),
      db.trade.count({ where: { status: "CLOSED" } }),
      db.chatThread.count({ where: { unreadForAdmin: { gt: 0 } } }),
      db.trade.aggregate({ where: { status: "CLOSED" }, _sum: { pnl: true } }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, firstName: true, lastName: true, email: true, status: true, createdAt: true, balance: true },
      }),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-mist-500">Everything happening on the platform right now.</p>
        </div>
        {unreadThreads > 0 && (
          <Link href="/admin/chat" className={buttonClass("primary", "sm")}>
            {unreadThreads} conversation{unreadThreads === 1 ? "" : "s"} waiting
          </Link>
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Registered users" value={users} />
        <Stat label="Suspended" value={suspended} tone={suspended > 0 ? "bad" : undefined} />
        <Stat label="Open positions" value={openTrades} />
        <Stat label="Closed trades" value={closedTrades} />
        <Stat
          label="Client realised P/L"
          value={`${(realised._sum.pnl ?? 0) >= 0 ? "+" : "−"}$${Math.abs(realised._sum.pnl ?? 0).toFixed(2)}`}
          tone={(realised._sum.pnl ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card
          title="Newest accounts"
          action={
            <Link href="/admin/users" className="text-xs text-accent-400 hover:text-accent-500">
              All users
            </Link>
          }
        >
          {recentUsers.length === 0 ? (
            <EmptyState title="No accounts yet" />
          ) : (
            <ul className="divide-y divide-ink-800/70">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-mist-100">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate text-xs text-mist-500">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular text-xs text-mist-500">${u.balance.toFixed(2)}</span>
                    <Badge tone={u.status === "ACTIVE" ? "good" : "bad"}>{u.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Audit log">
          {recentLog.length === 0 ? (
            <EmptyState title="Nothing logged yet" />
          ) : (
            <ul className="divide-y divide-ink-800/70">
              {recentLog.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-mist-100">{entry.action}</p>
                    {entry.detail && <p className="truncate text-xs text-mist-500">{entry.detail}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-mist-500">{fmt(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
