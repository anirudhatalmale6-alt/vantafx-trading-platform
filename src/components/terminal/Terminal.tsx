"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SYMBOL, getInstrument } from "@/lib/instruments";
import { computeMargin, computePnl, round2 } from "@/lib/pnl-math";
import { apiGet, apiPost } from "@/lib/client-api";
import { Stat, cx } from "@/components/ui";
import { usePrices } from "@/components/prices/usePrices";
import { PriceChart } from "./PriceChart";
import { Watchlist } from "./Watchlist";
import { OrderTicket } from "./OrderTicket";
import { PositionsPanel, type OpenPosition } from "./PositionsPanel";

type ServerState = {
  open: OpenPosition[];
  summary: {
    balance: number;
    equity: number;
    usedMargin: number;
    freeMargin: number;
    marginLevel: number | null;
    openPnl: number;
    openCount: number;
  };
};

const REFRESH_MS = 5000;

export function Terminal({ initial }: { initial: ServerState }) {
  const { quotes, connected } = usePrices();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState("M15");
  const [state, setState] = useState<ServerState>(initial);
  const [busy, setBusy] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await apiGet<ServerState>("/api/trades");
      setState(next);
    } catch {
      // A transient failure just means the next poll shows the truth.
    }
  }, []);

  // The server can close a position on its own (stop loss / take profit), so the
  // client polls rather than assuming its own copy is authoritative.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  function flashNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }

  const mid = useMemo(() => (s: string) => quotes[s]?.mid, [quotes]);

  /**
   * Positions are revalued in the browser on every tick using the same maths the
   * server books with, so the number moves smoothly between polls instead of
   * jumping once every five seconds.
   */
  const open = useMemo<OpenPosition[]>(() => {
    return state.open.map((p) => {
      const q = quotes[p.symbol];
      if (!q) return p;
      const current = p.side === "BUY" ? q.bid : q.ask;
      return {
        ...p,
        currentPrice: current,
        pnl: computePnl(p.symbol, p.side, p.volume, p.openPrice, current, mid),
        margin: computeMargin(p.symbol, p.volume, mid),
      };
    });
  }, [state.open, quotes, mid]);

  const summary = useMemo(() => {
    const openPnl = round2(open.reduce((s, t) => s + t.pnl, 0));
    const usedMargin = round2(open.reduce((s, t) => s + t.margin, 0));
    const equity = round2(state.summary.balance + openPnl);
    return {
      balance: state.summary.balance,
      openPnl,
      usedMargin,
      equity,
      freeMargin: round2(equity - usedMargin),
      marginLevel: usedMargin > 0 ? round2((equity / usedMargin) * 100) : null,
    };
  }, [open, state.summary.balance]);

  const placeOrder = useCallback(
    async (order: { side: "BUY" | "SELL"; volume: number; stopLoss: number | null; takeProfit: number | null }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await apiPost<ServerState>("/api/trades", { symbol, ...order });
        setState({ open: res.open, summary: res.summary });
        setRefreshKey((k) => k + 1);
        flashNotice(`${order.side} ${order.volume.toFixed(2)} ${symbol} filled.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Order rejected");
      } finally {
        setBusy(false);
      }
    },
    [symbol],
  );

  const closePosition = useCallback(async (id: string) => {
    setClosingId(id);
    setError(null);
    try {
      const res = await apiPost<ServerState & { pnl: number }>("/api/trades/close", { tradeId: id });
      setState({ open: res.open, summary: res.summary });
      setRefreshKey((k) => k + 1);
      flashNotice(`Position closed for ${res.pnl >= 0 ? "+" : "−"}$${Math.abs(res.pnl).toFixed(2)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the position");
    } finally {
      setClosingId(null);
    }
  }, []);

  const inst = getInstrument(symbol);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4 sm:py-4">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Balance" value={`$${summary.balance.toFixed(2)}`} />
        <Stat label="Equity" value={`$${summary.equity.toFixed(2)}`} />
        <Stat
          label="Floating P/L"
          value={`${summary.openPnl >= 0 ? "+" : "−"}$${Math.abs(summary.openPnl).toFixed(2)}`}
          tone={summary.openPnl >= 0 ? "good" : "bad"}
        />
        <Stat label="Free margin" value={`$${summary.freeMargin.toFixed(2)}`} />
        <Stat
          label="Margin level"
          value={summary.marginLevel === null ? "—" : `${summary.marginLevel.toFixed(0)}%`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_290px]">
        <aside className="order-2 rounded-xl border border-ink-700 bg-ink-900 lg:order-1 lg:h-[560px]">
          <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
            <h2 className="text-xs font-semibold tracking-wide text-mist-300 uppercase">Watchlist</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-mist-500">
              <span className={cx("h-1.5 w-1.5 rounded-full", connected ? "bg-accent-500" : "bg-warn-500")} />
              {connected ? "Live" : "…"}
            </span>
          </div>
          <div className="h-[320px] lg:h-[calc(560px-41px)]">
            <Watchlist quotes={quotes} selected={symbol} onSelect={setSymbol} />
          </div>
        </aside>

        <section className="order-1 rounded-xl border border-ink-700 bg-ink-900 lg:order-2 lg:h-[560px]">
          <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
            <div className="flex items-baseline gap-3">
              <h1 className="text-sm font-semibold text-mist-100">{inst?.display ?? symbol}</h1>
              <span className="tabular text-sm text-mist-300">
                {quotes[symbol] ? quotes[symbol].mid.toFixed(inst?.digits ?? 5) : "—"}
              </span>
              <span
                className={cx(
                  "tabular text-xs",
                  (quotes[symbol]?.changePct ?? 0) >= 0 ? "text-accent-400" : "text-bear-500",
                )}
              >
                {quotes[symbol]
                  ? `${quotes[symbol].changePct >= 0 ? "+" : ""}${quotes[symbol].changePct.toFixed(2)}%`
                  : ""}
              </span>
            </div>
          </div>
          <div className="h-[380px] lg:h-[calc(560px-41px)]">
            <PriceChart
              symbol={symbol}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              quote={quotes[symbol]}
            />
          </div>
        </section>

        <aside className="order-3 rounded-xl border border-ink-700 bg-ink-900 lg:h-[560px] lg:overflow-y-auto">
          <div className="border-b border-ink-700 px-3 py-2">
            <h2 className="text-xs font-semibold tracking-wide text-mist-300 uppercase">Order ticket</h2>
          </div>
          <OrderTicket
            symbol={symbol}
            quotes={quotes}
            freeMargin={summary.freeMargin}
            onSubmit={placeOrder}
            busy={busy}
            error={error}
            notice={notice}
          />
        </aside>
      </div>

      <div className="mt-3 h-[340px] rounded-xl border border-ink-700 bg-ink-900">
        <PositionsPanel open={open} onClose={closePosition} closingId={closingId} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
