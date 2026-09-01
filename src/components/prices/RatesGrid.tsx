"use client";

import { INSTRUMENTS } from "@/lib/instruments";
import { cx } from "@/components/ui";
import { usePrices } from "./usePrices";

/** Public live-rates table shown on the landing page. */
export function RatesGrid() {
  const { quotes, connected } = usePrices();

  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wide text-mist-300 uppercase">Live rates</h3>
        <span className="flex items-center gap-2 text-xs text-mist-500">
          <span className={cx("h-2 w-2 rounded-full", connected ? "bg-accent-500" : "bg-warn-500")} />
          {connected ? "Streaming" : "Connecting"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-ink-800 text-left text-xs tracking-wide text-mist-500 uppercase">
              <th className="px-4 py-2 font-medium">Instrument</th>
              <th className="px-4 py-2 text-right font-medium">Bid</th>
              <th className="px-4 py-2 text-right font-medium">Ask</th>
              <th className="px-4 py-2 text-right font-medium">Spread</th>
              <th className="px-4 py-2 text-right font-medium">24h</th>
            </tr>
          </thead>
          <tbody>
            {INSTRUMENTS.map((inst) => {
              const q = quotes[inst.symbol];
              const spread = q ? ((q.ask - q.bid) / inst.pip).toFixed(1) : "—";
              return (
                <tr key={inst.symbol} className="border-b border-ink-800/70 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-mist-100">{inst.display}</span>
                    <span className="ml-2 text-xs text-mist-500">{inst.group}</span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-mist-100">{q ? q.bid.toFixed(inst.digits) : "—"}</td>
                  <td className="tabular px-4 py-2.5 text-right text-mist-100">{q ? q.ask.toFixed(inst.digits) : "—"}</td>
                  <td className="tabular px-4 py-2.5 text-right text-mist-500">{spread}</td>
                  <td
                    className={cx(
                      "tabular px-4 py-2.5 text-right",
                      !q && "text-mist-500",
                      q && q.changePct >= 0 && "text-accent-400",
                      q && q.changePct < 0 && "text-bear-500",
                    )}
                  >
                    {q ? `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
