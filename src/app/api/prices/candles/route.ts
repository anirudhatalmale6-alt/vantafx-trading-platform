import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getInstrument } from "@/lib/instruments";
import { candles, isTimeframe, quote } from "@/lib/prices/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
  const tf = (url.searchParams.get("tf") ?? "M15").toUpperCase();
  const count = Math.min(Math.max(Number(url.searchParams.get("count") ?? 220) || 220, 20), 500);

  if (!getInstrument(symbol)) return fail("Unknown symbol", 404);
  if (!isTimeframe(tf)) return fail("Unknown timeframe", 400);

  return NextResponse.json({
    symbol,
    timeframe: tf,
    candles: candles(symbol, tf, count),
    quote: quote(symbol),
  });
}
