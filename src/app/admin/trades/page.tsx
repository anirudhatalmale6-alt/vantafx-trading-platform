import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getInstrument } from "@/lib/instruments";
import { decorate } from "@/lib/trading";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ForceCloseButton } from "./ForceCloseButton";

export const metadata: Metadata = { title: "Trades" };
export const dynamic = "force-dynamic";

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminTradesPage() {
  await requireAdmin();
  const now = Date.now();

  const [open, closed] = await Promise.all([
    db.trade.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      take: 200,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    db.trade.findMany({
      where: { status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 100,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Trades</h1>
      <p className="mt-1 text-sm text-mist-500">
        Live book across every client. Floating P/L is valued at the current market price.
      </p>

      <div className="mt-5 space-y-4">
        <Card title={`Open positions (${open.length})`}>
          {open.length === 0 ? (
            <EmptyState title="No open positions" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-ink-800 text-left text-[11px] tracking-wide text-mist-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-4 py-2.5 font-medium">Side</th>
                    <th className="px-4 py-2.5 text-right font-medium">Volume</th>
                    <th className="px-4 py-2.5 text-right font-medium">Open</th>
                    <th className="px-4 py-2.5 text-right font-medium">Current</th>
                    <th className="px-4 py-2.5 text-right font-medium">P/L</th>
                    <th className="px-4 py-2.5 font-medium">Opened</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {open.map((trade) => {
                    const live = decorate(trade, now);
                    return (
                      <tr key={trade.id} className="border-b border-ink-800/70 last:border-0">
                        <td className="px-4 py-2.5">
                          <p className="text-mist-100">
                            {trade.user.firstName} {trade.user.lastName}
                          </p>
                          <p className="text-xs text-mist-500">{trade.user.email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-mist-100">
                          {getInstrument(trade.symbol)?.display ?? trade.symbol}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={trade.side === "BUY" ? "good" : "bad"}>{trade.side}</Badge>
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-mist-300">{trade.volume.toFixed(2)}</td>
                        <td className="tabular px-4 py-2.5 text-right text-mist-300">
                          {trade.openPrice.toFixed(getInstrument(trade.symbol)?.digits ?? 5)}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-mist-100">
                          {live.currentPrice.toFixed(getInstrument(trade.symbol)?.digits ?? 5)}
                        </td>
                        <td
                          className={`tabular px-4 py-2.5 text-right font-medium ${live.pnl >= 0 ? "text-accent-400" : "text-bear-500"}`}
                        >
                          {live.pnl >= 0 ? "+" : "−"}${Math.abs(live.pnl).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-mist-500">{fmt(trade.openedAt)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <ForceCloseButton tradeId={trade.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recently closed">
          {closed.length === 0 ? (
            <EmptyState title="No closed trades yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-ink-800 text-left text-[11px] tracking-wide text-mist-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-4 py-2.5 font-medium">Side</th>
                    <th className="px-4 py-2.5 text-right font-medium">Volume</th>
                    <th className="px-4 py-2.5 font-medium">Closed</th>
                    <th className="px-4 py-2.5 font-medium">Reason</th>
                    <th className="px-4 py-2.5 text-right font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((trade) => (
                    <tr key={trade.id} className="border-b border-ink-800/70 last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="text-mist-100">
                          {trade.user.firstName} {trade.user.lastName}
                        </p>
                        <p className="text-xs text-mist-500">{trade.user.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-mist-100">
                        {getInstrument(trade.symbol)?.display ?? trade.symbol}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={trade.side === "BUY" ? "good" : "bad"}>{trade.side}</Badge>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-mist-300">{trade.volume.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-xs text-mist-500">{fmt(trade.closedAt)}</td>
                      <td className="px-4 py-2.5 text-xs text-mist-500">{trade.closeType ?? "MANUAL"}</td>
                      <td
                        className={`tabular px-4 py-2.5 text-right font-medium ${(trade.pnl ?? 0) >= 0 ? "text-accent-400" : "text-bear-500"}`}
                      >
                        {(trade.pnl ?? 0) >= 0 ? "+" : "−"}${Math.abs(trade.pnl ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
