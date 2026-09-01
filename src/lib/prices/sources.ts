import { INSTRUMENTS } from "@/lib/instruments";
import { setAnchor } from "./engine";

/**
 * Optional real-rate anchoring.
 *
 * PRICE_SOURCE=ecb pulls the European Central Bank daily reference rates from
 * frankfurter.app - free, keyless, no signup - and re-centres the synthetic feed
 * on them. The intraday shape stays synthetic; only the level becomes real.
 *
 * If the fetch fails for any reason the built-in anchors stay in place, so the
 * platform never goes blank because a third party is down.
 */

const REFRESH_MS = 6 * 60 * 60 * 1000; // ECB publishes once a working day
let lastRefresh = 0;
let inFlight: Promise<void> | null = null;

export function priceSource(): "simulated" | "ecb" {
  return process.env.PRICE_SOURCE === "ecb" ? "ecb" : "simulated";
}

type FrankfurterResponse = { base: string; rates: Record<string, number> };

async function fetchEcbRates(): Promise<Record<string, number> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as FrankfurterResponse;
    if (!json?.rates) return null;
    return { EUR: 1, ...json.rates };
  } catch {
    return null;
  }
}

/** EUR-based rate table -> price of `base/quote`. */
function cross(rates: Record<string, number>, base: string, quote: string): number | null {
  const b = rates[base];
  const q = rates[quote];
  if (!b || !q) return null;
  return q / b;
}

export async function refreshAnchors(force = false): Promise<void> {
  if (priceSource() !== "ecb") return;
  const now = Date.now();
  if (!force && now - lastRefresh < REFRESH_MS) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const rates = await fetchEcbRates();
    if (rates) {
      for (const inst of INSTRUMENTS) {
        const p = cross(rates, inst.base, inst.quote);
        if (p) setAnchor(inst.symbol, p);
      }
      lastRefresh = Date.now();
    } else {
      // Back off for 15 minutes rather than hammering a failing endpoint.
      lastRefresh = Date.now() - REFRESH_MS + 15 * 60 * 1000;
    }
    inFlight = null;
  })();

  return inFlight;
}
