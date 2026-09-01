"use client";

import { INSTRUMENTS } from "@/lib/instruments";
import { usePrices } from "./usePrices";
import { cx } from "@/components/ui";

/** Scrolling strip of live quotes used on the public pages. */
export function MarketTicker() {
  const { quotes } = usePrices();
  const items = INSTRUMENTS.map((inst) => {
    const q = quotes[inst.symbol];
    return {
      symbol: inst.symbol,
      display: inst.display,
      price: q ? q.mid.toFixed(inst.digits) : "—".padEnd(inst.digits, " "),
      changePct: q?.changePct ?? 0,
      live: Boolean(q),
    };
  });

  return (
    <div className="relative overflow-hidden border-y border-ink-700 bg-ink-900/80 py-2.5">
      {/* The track holds two copies so the loop has no visible seam. */}
      <div className="marquee-track flex w-max gap-8 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-8" aria-hidden={copy === 1}>
            {items.map((item) => (
              <span key={`${copy}-${item.symbol}`} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-mist-300">{item.display}</span>
                <span className="tabular text-mist-100">{item.price}</span>
                <span
                  className={cx(
                    "tabular text-xs",
                    !item.live && "text-mist-500",
                    item.live && item.changePct >= 0 && "text-accent-400",
                    item.live && item.changePct < 0 && "text-bear-500",
                  )}
                >
                  {item.live ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%` : ""}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
