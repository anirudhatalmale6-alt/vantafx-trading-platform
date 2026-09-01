import { INSTRUMENTS, requireInstrument, type Instrument } from "@/lib/instruments";

/**
 * Deterministic synthetic price feed.
 *
 * The price of a symbol at time t is a *pure function* of (symbol, t) - there is
 * no ticking state anywhere. That buys three things:
 *   1. history is reproducible, so charts and P/L always agree;
 *   2. a server restart does not create a discontinuity in the chart;
 *   3. two Node processes behind a load balancer quote the same price.
 *
 * The shape is fractal value-noise: several octaves of smoothed noise summed with
 * amplitude proportional to sqrt(period), which is what gives a random walk its
 * characteristic look at every zoom level.
 */

// Octave periods in seconds, longest first.
const OCTAVES = [604_800, 172_800, 43_200, 10_800, 3_600, 900, 240, 60];
const AMPLITUDES = OCTAVES.map((p) => Math.sqrt(p / OCTAVES[0]));
const AMP_SUM = AMPLITUDES.reduce((a, b) => a + b, 0);

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Integer hash -> uniform [0,1). */
function rand(n: number): number {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/** Smoothed 1-D value noise in [-1,1]. */
function noise(seed: number, octave: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const k = Math.imul(octave + 1, 0x9e3779b1);
  const a = rand(seed ^ k ^ Math.imul(i, 0x85ebca6b)) * 2 - 1;
  const b = rand(seed ^ k ^ Math.imul(i + 1, 0x85ebca6b)) * 2 - 1;
  const u = f * f * (3 - 2 * f); // smoothstep
  return a + (b - a) * u;
}

const seedCache = new Map<string, number>();
function seedFor(symbol: string): number {
  let s = seedCache.get(symbol);
  if (s === undefined) {
    s = fnv1a(`vantafx:${symbol}`);
    seedCache.set(symbol, s);
  }
  return s;
}

/**
 * Anchor overrides let a real-rate source (see ./sources.ts) re-centre the
 * synthetic curve on today's actual market rate without changing its shape.
 */
const anchorOverrides = new Map<string, number>();

export function setAnchor(symbol: string, price: number) {
  if (Number.isFinite(price) && price > 0) anchorOverrides.set(symbol.toUpperCase(), price);
}

export function getAnchor(inst: Instrument): number {
  return anchorOverrides.get(inst.symbol) ?? inst.anchor;
}

/** Mid price of `symbol` at unix time `tSeconds`. */
export function midPriceAt(symbol: string, tSeconds: number): number {
  const inst = requireInstrument(symbol);
  const seed = seedFor(inst.symbol);
  let sum = 0;
  for (let k = 0; k < OCTAVES.length; k++) {
    sum += AMPLITUDES[k] * noise(seed, k, tSeconds / OCTAVES[k]);
  }
  const drift = (sum / AMP_SUM) * inst.volatility;
  const price = getAnchor(inst) * Math.exp(drift);
  return round(price, inst.digits);
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

export type Quote = {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  /** Change vs. the same instrument 24h ago, in percent. */
  changePct: number;
  digits: number;
  ts: number;
};

export function quote(symbol: string, atMs: number = Date.now()): Quote {
  const inst = requireInstrument(symbol);
  const t = atMs / 1000;
  const mid = midPriceAt(inst.symbol, t);
  const halfSpread = (inst.spreadPips * inst.pip) / 2;
  const prev = midPriceAt(inst.symbol, t - 86_400);
  return {
    symbol: inst.symbol,
    bid: round(mid - halfSpread, inst.digits),
    ask: round(mid + halfSpread, inst.digits),
    mid,
    changePct: ((mid - prev) / prev) * 100,
    digits: inst.digits,
    ts: Math.floor(atMs),
  };
}

export function quoteAll(atMs: number = Date.now()): Quote[] {
  return INSTRUMENTS.map((i) => quote(i.symbol, atMs));
}

/** The price a market order actually fills at. */
export function fillPrice(symbol: string, side: "BUY" | "SELL", atMs: number = Date.now()): number {
  const q = quote(symbol, atMs);
  return side === "BUY" ? q.ask : q.bid;
}

/** The price an open position is currently valued/closed at. */
export function exitPrice(symbol: string, side: "BUY" | "SELL", atMs: number = Date.now()): number {
  const q = quote(symbol, atMs);
  return side === "BUY" ? q.bid : q.ask;
}

export const TIMEFRAMES = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  H4: 14_400,
  D1: 86_400,
} as const;

export type Timeframe = keyof typeof TIMEFRAMES;

export function isTimeframe(v: string): v is Timeframe {
  return Object.prototype.hasOwnProperty.call(TIMEFRAMES, v);
}

export type Candle = { time: number; open: number; high: number; low: number; close: number };

/**
 * OHLC for the last `count` candles, ending with the (still forming) current one.
 * Each candle is sampled at 20 points, which is enough for the wicks to look real
 * without making the request expensive.
 */
export function candles(symbol: string, timeframe: Timeframe, count = 200, atMs: number = Date.now()): Candle[] {
  const inst = requireInstrument(symbol);
  const step = TIMEFRAMES[timeframe];
  const now = Math.floor(atMs / 1000);
  const currentStart = Math.floor(now / step) * step;
  const SAMPLES = 20;
  const out: Candle[] = [];

  for (let n = count - 1; n >= 0; n--) {
    const start = currentStart - n * step;
    const end = Math.min(start + step, now);
    const span = Math.max(end - start, 1);
    let open = 0;
    let high = -Infinity;
    let low = Infinity;
    let close = 0;
    for (let s = 0; s <= SAMPLES; s++) {
      const t = start + (span * s) / SAMPLES;
      const p = midPriceAt(inst.symbol, t);
      if (s === 0) open = p;
      close = p;
      if (p > high) high = p;
      if (p < low) low = p;
    }
    out.push({ time: start, open, high, low, close });
  }
  return out;
}
