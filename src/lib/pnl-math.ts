import { LEVERAGE, getInstrument, requireInstrument } from "@/lib/instruments";

/**
 * Pure P/L and margin maths, shared by the server (which books the trade) and the
 * browser (which revalues open positions on every tick). Keeping one copy is the
 * point: a second implementation would drift and the numbers would disagree.
 */
export type MidLookup = (symbol: string) => number | undefined;

/** Value of one unit of `currency` in USD, given a source of mid prices. */
export function usdRate(currency: string, mid: MidLookup): number {
  if (currency === "USD") return 1;

  const direct = getInstrument(`${currency}USD`);
  if (direct) {
    const m = mid(direct.symbol);
    if (m) return m;
  }
  const inverse = getInstrument(`USD${currency}`);
  if (inverse) {
    const m = mid(inverse.symbol);
    if (m) return 1 / m;
  }
  return 1; // no route to USD - treat 1:1 rather than throwing mid-trade
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function computePnl(
  symbol: string,
  side: "BUY" | "SELL",
  volume: number,
  openPrice: number,
  currentPrice: number,
  mid: MidLookup,
): number {
  const inst = requireInstrument(symbol);
  const direction = side === "BUY" ? 1 : -1;
  const inQuote = (currentPrice - openPrice) * direction * volume * inst.contractSize;
  return round2(inQuote * usdRate(inst.quote, mid));
}

export function computeMargin(symbol: string, volume: number, mid: MidLookup): number {
  const inst = requireInstrument(symbol);
  return round2((volume * inst.contractSize * usdRate(inst.base, mid)) / LEVERAGE);
}

/** Distance between two prices expressed in pips. */
export function pips(symbol: string, from: number, to: number): number {
  const inst = requireInstrument(symbol);
  return (to - from) / inst.pip;
}
