"use client";

import { useEffect, useMemo, useState } from "react";
import { requireInstrument } from "@/lib/instruments";
import { computeMargin } from "@/lib/pnl-math";
import { Alert, Button, cx } from "@/components/ui";
import type { QuoteMap } from "@/components/prices/usePrices";

const VOLUME_STEPS = [0.01, 0.1, 0.5, 1];

export function OrderTicket({
  symbol,
  quotes,
  freeMargin,
  onSubmit,
  busy,
  error,
  notice,
}: {
  symbol: string;
  quotes: QuoteMap;
  freeMargin: number;
  onSubmit: (order: { side: "BUY" | "SELL"; volume: number; stopLoss: number | null; takeProfit: number | null }) => void;
  busy: boolean;
  error: string | null;
  notice: string | null;
}) {
  const inst = requireInstrument(symbol);
  const quote = quotes[symbol];
  const [volume, setVolume] = useState("0.10");
  const [useStops, setUseStops] = useState(false);
  const [slPips, setSlPips] = useState("50");
  const [tpPips, setTpPips] = useState("100");

  // Stops are entered in pips because that is how traders think; the absolute
  // price is derived at submit time from the side that will actually fill.
  const volumeNumber = Number(volume);
  const volumeValid = Number.isFinite(volumeNumber) && volumeNumber >= 0.01 && volumeNumber <= 50;

  const mid = useMemo(() => (s: string) => quotes[s]?.mid, [quotes]);
  const margin = volumeValid && quote ? computeMargin(symbol, volumeNumber, mid) : 0;
  const notional = volumeValid ? volumeNumber * inst.contractSize : 0;
  const enoughMargin = margin <= freeMargin;

  useEffect(() => {
    // A pip distance that made sense on EUR/USD is nonsense on gold.
    setSlPips(inst.symbol === "XAUUSD" ? "200" : "50");
    setTpPips(inst.symbol === "XAUUSD" ? "400" : "100");
  }, [inst.symbol]);

  function place(side: "BUY" | "SELL") {
    if (!quote || !volumeValid) return;
    const entry = side === "BUY" ? quote.ask : quote.bid;
    let stopLoss: number | null = null;
    let takeProfit: number | null = null;

    if (useStops) {
      const sl = Number(slPips);
      const tp = Number(tpPips);
      const round = (v: number) => Number(v.toFixed(inst.digits));
      if (Number.isFinite(sl) && sl > 0) {
        stopLoss = round(side === "BUY" ? entry - sl * inst.pip : entry + sl * inst.pip);
      }
      if (Number.isFinite(tp) && tp > 0) {
        takeProfit = round(side === "BUY" ? entry + tp * inst.pip : entry - tp * inst.pip);
      }
    }

    onSubmit({ side, volume: Number(volumeNumber.toFixed(2)), stopLoss, takeProfit });
  }

  const spread = quote ? ((quote.ask - quote.bid) / inst.pip).toFixed(1) : "—";

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-mist-100">{inst.display}</span>
        <span className="text-xs text-mist-500">
          spread <span className="tabular text-mist-300">{spread}</span> pips
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => place("SELL")}
          disabled={busy || !quote || !volumeValid}
          className="rounded-lg border border-bear-500/40 bg-bear-500/10 px-3 py-2.5 text-left transition-colors hover:bg-bear-500/20 disabled:opacity-50"
        >
          <span className="block text-[11px] font-medium tracking-wide text-bear-500 uppercase">Sell</span>
          <span className="tabular block text-lg font-semibold text-mist-100">
            {quote ? quote.bid.toFixed(inst.digits) : "—"}
          </span>
        </button>
        <button
          onClick={() => place("BUY")}
          disabled={busy || !quote || !volumeValid}
          className="rounded-lg border border-accent-500/40 bg-accent-500/10 px-3 py-2.5 text-right transition-colors hover:bg-accent-500/20 disabled:opacity-50"
        >
          <span className="block text-[11px] font-medium tracking-wide text-accent-400 uppercase">Buy</span>
          <span className="tabular block text-lg font-semibold text-mist-100">
            {quote ? quote.ask.toFixed(inst.digits) : "—"}
          </span>
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-mist-300" htmlFor="volume">
          Volume (lots)
        </label>
        <div className="flex gap-2">
          <input
            id="volume"
            inputMode="decimal"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className={cx(
              "tabular h-9 w-full rounded-lg border bg-ink-850 px-3 text-sm text-mist-100 focus:outline-none focus:ring-2 focus:ring-accent-500/60",
              volumeValid ? "border-ink-600" : "border-bear-500",
            )}
          />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {VOLUME_STEPS.map((v) => (
            <button
              key={v}
              onClick={() => setVolume(v.toFixed(2))}
              className="tabular rounded-md border border-ink-700 px-2 py-1 text-xs text-mist-300 hover:border-mist-500 hover:text-mist-100"
            >
              {v.toFixed(2)}
            </button>
          ))}
        </div>
        {!volumeValid && <p className="mt-1 text-xs text-bear-500">Enter between 0.01 and 50 lots.</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-mist-300">
        <input
          type="checkbox"
          checked={useStops}
          onChange={(e) => setUseStops(e.target.checked)}
          className="h-4 w-4 rounded border-ink-600 bg-ink-850 accent-[#22c07d]"
        />
        Attach stop loss / take profit
      </label>

      {useStops && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-mist-500">Stop loss (pips)</span>
            <input
              inputMode="numeric"
              value={slPips}
              onChange={(e) => setSlPips(e.target.value)}
              className="tabular h-9 w-full rounded-lg border border-ink-600 bg-ink-850 px-3 text-sm text-mist-100 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-mist-500">Take profit (pips)</span>
            <input
              inputMode="numeric"
              value={tpPips}
              onChange={(e) => setTpPips(e.target.value)}
              className="tabular h-9 w-full rounded-lg border border-ink-600 bg-ink-850 px-3 text-sm text-mist-100 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
            />
          </label>
        </div>
      )}

      <dl className="space-y-1 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-xs">
        <div className="flex justify-between">
          <dt className="text-mist-500">Contract size</dt>
          <dd className="tabular text-mist-300">
            {notional.toLocaleString("en-US")} {inst.base}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-mist-500">Margin required</dt>
          <dd className={cx("tabular", enoughMargin ? "text-mist-300" : "text-bear-500")}>
            ${margin.toFixed(2)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-mist-500">Free margin</dt>
          <dd className="tabular text-mist-300">${freeMargin.toFixed(2)}</dd>
        </div>
      </dl>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && !error && <Alert kind="success">{notice}</Alert>}

      {busy && (
        <Button variant="outline" size="sm" disabled className="w-full">
          Sending order…
        </Button>
      )}
    </div>
  );
}
