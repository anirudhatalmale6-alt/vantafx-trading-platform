"use client";

import { memo } from "react";
import { INSTRUMENTS } from "@/lib/instruments";
import { cx } from "@/components/ui";
import type { QuoteMap } from "@/components/prices/usePrices";

function Row({
  symbol,
  display,
  digits,
  pip,
  active,
  bid,
  ask,
  changePct,
  onSelect,
}: {
  symbol: string;
  display: string;
  digits: number;
  pip: number;
  active: boolean;
  bid?: number;
  ask?: number;
  changePct?: number;
  onSelect: (s: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(symbol)}
      aria-current={active}
      className={cx(
        "grid w-full grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2 text-left transition-colors",
        active ? "bg-ink-800" : "hover:bg-ink-850",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-mist-100">{display}</span>
        <span
          className={cx(
            "tabular block text-[11px]",
            changePct === undefined && "text-mist-500",
            changePct !== undefined && changePct >= 0 && "text-accent-400",
            changePct !== undefined && changePct < 0 && "text-bear-500",
          )}
        >
          {changePct === undefined ? "—" : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
        </span>
      </span>
      <span className="tabular text-right text-sm text-bear-500">{bid?.toFixed(digits) ?? "—"}</span>
      <span className="tabular text-right text-sm text-accent-400">{ask?.toFixed(digits) ?? "—"}</span>
    </button>
  );
}

const MemoRow = memo(Row);

export function Watchlist({
  quotes,
  selected,
  onSelect,
}: {
  quotes: QuoteMap;
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-ink-700 px-3 py-2 text-[11px] tracking-wide text-mist-500 uppercase">
        <span>Instrument</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>
      <div className="flex-1 divide-y divide-ink-800/70 overflow-y-auto">
        {INSTRUMENTS.map((inst) => {
          const q = quotes[inst.symbol];
          return (
            <MemoRow
              key={inst.symbol}
              symbol={inst.symbol}
              display={inst.display}
              digits={inst.digits}
              pip={inst.pip}
              active={inst.symbol === selected}
              bid={q?.bid}
              ask={q?.ask}
              changePct={q?.changePct}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
