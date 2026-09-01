"use client";

import { useCallback, useEffect, useState } from "react";
import { getInstrument } from "@/lib/instruments";
import { Badge, EmptyState, cx } from "@/components/ui";
import { apiGet } from "@/lib/client-api";

export type OpenPosition = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  currentPrice: number;
  pnl: number;
  margin: number;
  openedAt: string;
};

type ClosedTrade = {
  id: string;
  symbol: string;
  side: string;
  volume: number;
  openPrice: number;
  closePrice: number | null;
  pnl: number | null;
  closeType: string | null;
  openedAt: string;
  closedAt: string | null;
};

const CLOSE_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  STOP_LOSS: "Stop loss",
  TAKE_PROFIT: "Take profit",
  ADMIN: "Closed by desk",
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function price(symbol: string, value: number | null) {
  if (value === null) return "—";
  return value.toFixed(getInstrument(symbol)?.digits ?? 5);
}

export function PositionsPanel({
  open,
  onClose,
  closingId,
  refreshKey,
}: {
  open: OpenPosition[];
  onClose: (id: string) => void;
  closingId: string | null;
  refreshKey: number;
}) {
  const [tab, setTab] = useState<"open" | "history">("open");
  const [history, setHistory] = useState<ClosedTrade[] | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiGet<{ trades: ClosedTrade[] }>("/api/trades/history?take=100");
      setHistory(res.trades);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") void loadHistory();
  }, [tab, loadHistory, refreshKey]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-ink-700 px-3 py-2">
        {(
          [
            ["open", `Open positions (${open.length})`],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cx(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === key ? "bg-ink-700 text-mist-100" : "text-mist-500 hover:bg-ink-850 hover:text-mist-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "open" ? (
          open.length === 0 ? (
            <EmptyState title="No open positions" body="Use the ticket on the right to place your first trade." />
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 bg-ink-900">
                <tr className="border-b border-ink-800 text-left text-[11px] tracking-wide text-mist-500 uppercase">
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Volume</th>
                  <th className="px-3 py-2 text-right font-medium">Open</th>
                  <th className="px-3 py-2 text-right font-medium">Current</th>
                  <th className="px-3 py-2 text-right font-medium">S/L</th>
                  <th className="px-3 py-2 text-right font-medium">T/P</th>
                  <th className="px-3 py-2 text-right font-medium">Margin</th>
                  <th className="px-3 py-2 text-right font-medium">P/L</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {open.map((t) => (
                  <tr key={t.id} className="border-b border-ink-800/70 last:border-0">
                    <td className="px-3 py-2 font-medium text-mist-100">{getInstrument(t.symbol)?.display ?? t.symbol}</td>
                    <td className="px-3 py-2">
                      <Badge tone={t.side === "BUY" ? "good" : "bad"}>{t.side}</Badge>
                    </td>
                    <td className="tabular px-3 py-2 text-right text-mist-300">{t.volume.toFixed(2)}</td>
                    <td className="tabular px-3 py-2 text-right text-mist-300">{price(t.symbol, t.openPrice)}</td>
                    <td className="tabular px-3 py-2 text-right text-mist-100">{price(t.symbol, t.currentPrice)}</td>
                    <td className="tabular px-3 py-2 text-right text-mist-500">{price(t.symbol, t.stopLoss)}</td>
                    <td className="tabular px-3 py-2 text-right text-mist-500">{price(t.symbol, t.takeProfit)}</td>
                    <td className="tabular px-3 py-2 text-right text-mist-500">${t.margin.toFixed(2)}</td>
                    <td className={cx("tabular px-3 py-2 text-right font-medium", t.pnl >= 0 ? "text-accent-400" : "text-bear-500")}>
                      {t.pnl >= 0 ? "+" : "−"}${Math.abs(t.pnl).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onClose(t.id)}
                        disabled={closingId === t.id}
                        className="rounded-md border border-ink-600 px-2.5 py-1 text-xs text-mist-300 hover:border-bear-500 hover:text-bear-500 disabled:opacity-50"
                      >
                        {closingId === t.id ? "Closing…" : "Close"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : history === null ? (
          <EmptyState title="Loading history…" />
        ) : history.length === 0 ? (
          <EmptyState title="No closed trades yet" body="Closed positions and their result will be listed here." />
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 bg-ink-900">
              <tr className="border-b border-ink-800 text-left text-[11px] tracking-wide text-mist-500 uppercase">
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 text-right font-medium">Volume</th>
                <th className="px-3 py-2 text-right font-medium">Open</th>
                <th className="px-3 py-2 text-right font-medium">Close</th>
                <th className="px-3 py-2 font-medium">Closed</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id} className="border-b border-ink-800/70 last:border-0">
                  <td className="px-3 py-2 font-medium text-mist-100">{getInstrument(t.symbol)?.display ?? t.symbol}</td>
                  <td className="px-3 py-2">
                    <Badge tone={t.side === "BUY" ? "good" : "bad"}>{t.side}</Badge>
                  </td>
                  <td className="tabular px-3 py-2 text-right text-mist-300">{t.volume.toFixed(2)}</td>
                  <td className="tabular px-3 py-2 text-right text-mist-300">{price(t.symbol, t.openPrice)}</td>
                  <td className="tabular px-3 py-2 text-right text-mist-300">{price(t.symbol, t.closePrice)}</td>
                  <td className="px-3 py-2 text-mist-500">{fmtTime(t.closedAt)}</td>
                  <td className="px-3 py-2 text-mist-500">{CLOSE_LABEL[t.closeType ?? "MANUAL"] ?? t.closeType}</td>
                  <td
                    className={cx(
                      "tabular px-3 py-2 text-right font-medium",
                      (t.pnl ?? 0) >= 0 ? "text-accent-400" : "text-bear-500",
                    )}
                  >
                    {(t.pnl ?? 0) >= 0 ? "+" : "−"}${Math.abs(t.pnl ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
