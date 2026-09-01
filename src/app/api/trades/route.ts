import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { openTradeSchema } from "@/lib/validation";
import { TradeError, getAccountState, openTrade } from "@/lib/trading";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open positions plus the live account summary. Polled by the terminal. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (isDenied(g)) return g.response;

  const state = await getAccountState(g.user.id);
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const g = await guard(req, { limit: { key: "trade-open", max: 60, windowMs: 60_000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, openTradeSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  try {
    const trade = await openTrade(g.user.id, {
      symbol: input.symbol,
      side: input.side,
      // Lot sizes are quoted in hundredths; anything finer is a UI rounding artefact.
      volume: Math.round(input.volume * 100) / 100,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
    });

    await db.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "trade.open",
        targetId: trade.id,
        detail: `${trade.side} ${trade.volume} ${trade.symbol} @ ${trade.openPrice}`,
        ip: clientIp(req),
      },
    });

    const state = await getAccountState(g.user.id);
    return NextResponse.json({ ok: true, trade: { id: trade.id }, ...state });
  } catch (e) {
    if (e instanceof TradeError) return fail(e.message, 422);
    console.error("[trades] open failed", e);
    return fail("Could not open the position. Please try again.", 500);
  }
}
