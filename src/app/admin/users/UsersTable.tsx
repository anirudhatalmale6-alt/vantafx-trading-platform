"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, EmptyState, cx } from "@/components/ui";
import { apiPost } from "@/lib/client-api";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  country: string | null;
  phone: string | null;
  role: string;
  status: string;
  balance: number;
  trades: number;
  createdAt: string;
};

export function UsersTable({
  users,
  currentAdminId,
  initialQuery,
}: {
  users: AdminUserRow[];
  currentAdminId: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [adjust, setAdjust] = useState<Record<string, string>>({});

  async function update(userId: string, payload: Record<string, unknown>, successText: string) {
    setBusyId(userId);
    setStatus(null);
    try {
      await apiPost("/api/admin/users", { userId, ...payload });
      setStatus({ kind: "success", text: successText });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setBusyId(null);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/admin/users?q=${encodeURIComponent(trimmed)}` : "/admin/users");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submitSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 w-full max-w-sm rounded-lg border border-ink-600 bg-ink-850 px-3 text-sm text-mist-100 placeholder:text-mist-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {status && <Alert kind={status.kind}>{status.text}</Alert>}

      <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900">
        {users.length === 0 ? (
          <EmptyState title="No matching users" body="Try a different name or email." />
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-[11px] tracking-wide text-mist-500 uppercase">
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                <th className="px-4 py-2.5 text-right font-medium">Trades</th>
                <th className="px-4 py-2.5 font-medium">Adjust balance</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentAdminId;
                const amount = adjust[u.id] ?? "";
                const amountValue = Number(amount);
                const amountValid = amount.trim() !== "" && Number.isFinite(amountValue) && amountValue !== 0;

                return (
                  <tr key={u.id} className="border-b border-ink-800/70 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-mist-100">
                        {u.name}
                        {isSelf && <span className="ml-2 text-xs text-mist-500">(you)</span>}
                      </p>
                      <p className="text-xs text-mist-500">{u.email}</p>
                      <p className="text-xs text-mist-500">
                        {[u.country, u.phone].filter(Boolean).join(" · ") || "No contact details"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "ADMIN" ? "warn" : "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.status === "ACTIVE" ? "good" : "bad"}>{u.status}</Badge>
                    </td>
                    <td className="tabular px-4 py-3 text-right text-mist-100">${u.balance.toFixed(2)}</td>
                    <td className="tabular px-4 py-3 text-right text-mist-500">{u.trades}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <input
                          value={amount}
                          onChange={(e) => setAdjust((a) => ({ ...a, [u.id]: e.target.value }))}
                          placeholder="+/- 500"
                          inputMode="decimal"
                          className={cx(
                            "tabular h-8 w-28 rounded-md border bg-ink-850 px-2 text-xs text-mist-100 placeholder:text-mist-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60",
                            amount.trim() === "" || amountValid ? "border-ink-600" : "border-bear-500",
                          )}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!amountValid || busyId === u.id}
                          onClick={() => {
                            void update(u.id, { balanceAdjustment: amountValue }, `Balance adjusted for ${u.name}.`);
                            setAdjust((a) => ({ ...a, [u.id]: "" }));
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {u.status === "ACTIVE" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isSelf || busyId === u.id}
                            onClick={() => void update(u.id, { status: "SUSPENDED" }, `${u.name} suspended.`)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busyId === u.id}
                            onClick={() => void update(u.id, { status: "ACTIVE" }, `${u.name} reactivated.`)}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSelf || busyId === u.id}
                          onClick={() =>
                            void update(
                              u.id,
                              { role: u.role === "ADMIN" ? "USER" : "ADMIN" },
                              `${u.name} is now ${u.role === "ADMIN" ? "a client" : "an admin"}.`,
                            )
                          }
                        >
                          {u.role === "ADMIN" ? "Make client" : "Make admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
