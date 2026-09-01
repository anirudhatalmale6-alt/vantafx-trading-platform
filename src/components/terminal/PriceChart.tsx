"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { getInstrument } from "@/lib/instruments";
import { cx } from "@/components/ui";
import type { Quote } from "@/components/prices/usePrices";

export const TIMEFRAME_SECONDS: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  H4: 14_400,
  D1: 86_400,
};

type Candle = { time: number; open: number; high: number; low: number; close: number };

export function PriceChart({
  symbol,
  timeframe,
  onTimeframeChange,
  quote,
}: {
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  quote: Quote | undefined;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandle = useRef<Candle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create the chart once; the library is imported here so it never runs during SSR.
  useEffect(() => {
    let disposed = false;
    let cleanupResize: (() => void) | undefined;

    (async () => {
      const { createChart, ColorType, CrosshairMode } = await import("lightweight-charts");
      if (disposed || !holder.current) return;

      const chart = createChart(holder.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#0a1020" },
          textColor: "#7c8bb0",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: "rgba(36,50,92,0.35)" },
          horzLines: { color: "rgba(36,50,92,0.35)" },
        },
        rightPriceScale: { borderColor: "#1a2545" },
        timeScale: { borderColor: "#1a2545", timeVisible: true, secondsVisible: false },
        crosshair: { mode: CrosshairMode.Normal },
        autoSize: false,
        handleScale: { axisPressedMouseMove: { time: true, price: false } },
      });

      const series = chart.addCandlestickSeries({
        upColor: "#22c07d",
        downColor: "#f2545b",
        borderVisible: false,
        wickUpColor: "#22c07d",
        wickDownColor: "#f2545b",
      });

      chartRef.current = chart;
      seriesRef.current = series;

      const resize = () => {
        if (!holder.current) return;
        chart.resize(holder.current.clientWidth, holder.current.clientHeight);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(holder.current);
      cleanupResize = () => observer.disconnect();
    })();

    return () => {
      disposed = true;
      cleanupResize?.();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Reload history whenever the instrument or timeframe changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    lastCandle.current = null;

    (async () => {
      try {
        const res = await fetch(`/api/prices/candles?symbol=${symbol}&tf=${timeframe}&count=240`);
        if (!res.ok) throw new Error(`Chart data unavailable (${res.status})`);
        const data = (await res.json()) as { candles: Candle[] };
        if (cancelled) return;

        // The series may not exist yet on a very fast first render; retry next tick.
        const apply = () => {
          const series = seriesRef.current;
          if (!series) {
            if (!cancelled) setTimeout(apply, 60);
            return;
          }
          const inst = getInstrument(symbol);
          series.applyOptions({
            priceFormat: {
              type: "price",
              precision: inst?.digits ?? 5,
              minMove: Math.pow(10, -(inst?.digits ?? 5)),
            },
          });
          series.setData(
            data.candles.map((c) => ({
              time: c.time as UTCTimestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            })),
          );
          lastCandle.current = data.candles[data.candles.length - 1] ?? null;
          chartRef.current?.timeScale().fitContent();
          setLoading(false);
        };
        apply();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Chart data unavailable");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Fold each incoming tick into the candle that is still forming.
  useEffect(() => {
    const series = seriesRef.current;
    const current = lastCandle.current;
    if (!series || !quote || quote.symbol !== symbol) return;

    const step = TIMEFRAME_SECONDS[timeframe] ?? 900;
    const bucket = Math.floor(quote.ts / 1000 / step) * step;
    const price = quote.mid;

    let candle: Candle;
    if (!current || bucket > current.time) {
      candle = { time: bucket, open: price, high: price, low: price, close: price };
    } else if (bucket < current.time) {
      return; // a late frame for a bucket we have already left
    } else {
      candle = {
        ...current,
        high: Math.max(current.high, price),
        low: Math.min(current.low, price),
        close: price,
      };
    }

    lastCandle.current = candle;
    series.update({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }, [quote, symbol, timeframe]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-ink-700 px-3 py-2">
        {Object.keys(TIMEFRAME_SECONDS).map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={cx(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              tf === timeframe ? "bg-ink-700 text-mist-100" : "text-mist-500 hover:bg-ink-850 hover:text-mist-300",
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="relative min-h-[280px] flex-1">
        <div ref={holder} className="absolute inset-0" />
        {(loading || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/70 text-sm text-mist-500">
            {error ?? "Loading chart…"}
          </div>
        )}
      </div>
    </div>
  );
}
