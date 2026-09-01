"use client";

import { useEffect, useRef, useState } from "react";

export type Quote = {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  changePct: number;
  digits: number;
  ts: number;
};

export type QuoteMap = Record<string, Quote>;

/**
 * Subscribes to the shared quote stream. EventSource reconnects on its own, so
 * a dropped connection heals without any retry code here; `connected` is only
 * used to show the user the state of the feed.
 */
export function usePrices(): { quotes: QuoteMap; connected: boolean } {
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [connected, setConnected] = useState(false);
  const framePending = useRef<QuoteMap | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/prices/stream");
    let raf = 0;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { quotes: Quote[] };
        const map: QuoteMap = {};
        for (const q of payload.quotes) map[q.symbol] = q;
        // Coalesce into one render per animation frame rather than one per tick.
        framePending.current = map;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            if (framePending.current) setQuotes(framePending.current);
          });
        }
        setConnected(true);
      } catch {
        /* ignore a malformed frame and wait for the next one */
      }
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      source.close();
    };
  }, []);

  return { quotes, connected };
}

/** Remembers the previous value so a cell can flash green or red on change. */
export function useDirection(value: number | undefined): "up" | "down" | null {
  const prev = useRef<number | undefined>(undefined);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value === undefined) return;
    if (prev.current !== undefined && value !== prev.current) {
      setDir(value > prev.current ? "up" : "down");
    }
    prev.current = value;
  }, [value]);

  return dir;
}
