export type Instrument = {
  symbol: string;
  display: string;
  base: string;
  quote: string;
  /** Reference price the synthetic feed oscillates around. */
  anchor: number;
  /** Decimal places used everywhere the price is printed. */
  digits: number;
  /** Value of one pip in quote currency. */
  pip: number;
  /** Units of the base currency in one lot. */
  contractSize: number;
  /** Typical broker spread, expressed in pips. */
  spreadPips: number;
  /** Relative move scale for the synthetic feed. */
  volatility: number;
  group: "Majors" | "Crosses" | "Metals";
};

export const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", display: "EUR/USD", base: "EUR", quote: "USD", anchor: 1.0854, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 0.8, volatility: 0.045, group: "Majors" },
  { symbol: "GBPUSD", display: "GBP/USD", base: "GBP", quote: "USD", anchor: 1.2718, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.1, volatility: 0.052, group: "Majors" },
  { symbol: "USDJPY", display: "USD/JPY", base: "USD", quote: "JPY", anchor: 148.24, digits: 3, pip: 0.01, contractSize: 100_000, spreadPips: 1.0, volatility: 0.055, group: "Majors" },
  { symbol: "USDCHF", display: "USD/CHF", base: "USD", quote: "CHF", anchor: 0.8846, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.2, volatility: 0.044, group: "Majors" },
  { symbol: "AUDUSD", display: "AUD/USD", base: "AUD", quote: "USD", anchor: 0.6624, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.0, volatility: 0.058, group: "Majors" },
  { symbol: "USDCAD", display: "USD/CAD", base: "USD", quote: "CAD", anchor: 1.3521, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.3, volatility: 0.048, group: "Majors" },
  { symbol: "NZDUSD", display: "NZD/USD", base: "NZD", quote: "USD", anchor: 0.6118, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.4, volatility: 0.060, group: "Majors" },
  { symbol: "EURGBP", display: "EUR/GBP", base: "EUR", quote: "GBP", anchor: 0.8534, digits: 5, pip: 0.0001, contractSize: 100_000, spreadPips: 1.2, volatility: 0.038, group: "Crosses" },
  { symbol: "EURJPY", display: "EUR/JPY", base: "EUR", quote: "JPY", anchor: 160.86, digits: 3, pip: 0.01, contractSize: 100_000, spreadPips: 1.5, volatility: 0.056, group: "Crosses" },
  { symbol: "GBPJPY", display: "GBP/JPY", base: "GBP", quote: "JPY", anchor: 188.52, digits: 3, pip: 0.01, contractSize: 100_000, spreadPips: 2.0, volatility: 0.068, group: "Crosses" },
  { symbol: "XAUUSD", display: "Gold / USD", base: "XAU", quote: "USD", anchor: 2036.4, digits: 2, pip: 0.1, contractSize: 100, spreadPips: 3.0, volatility: 0.130, group: "Metals" },
];

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function requireInstrument(symbol: string): Instrument {
  const i = getInstrument(symbol);
  if (!i) throw new Error(`Unknown instrument: ${symbol}`);
  return i;
}

export const DEFAULT_SYMBOL = "EURUSD";
export const LEVERAGE = 100;

export function formatPrice(symbol: string, price: number): string {
  const i = getInstrument(symbol);
  return price.toFixed(i ? i.digits : 5);
}
