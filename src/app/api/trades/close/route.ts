import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { closeTradeSchema } from "@/lib/validation";
import { TradeError, closeTrade, getAccountState } from "@/lib/trading";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await guard(req, { limit: { key: "trade-close", max: 60, windowMs: 60_000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, closeTradeSchema);
  if ("response" in parsed) return parsed.response;

  try {
    // Ownership is enforced inside closeTrade, so one user can never close another's position.
    const trade = await closeTrade(parsed.data.tradeId, { userId: g.user.id, closeType: "MANUAL" });
    await db.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "trade.close",
        targetId: trade.id,
        detail: `${trade.symbol} @ ${trade.closePrice} pnl ${trade.pnl}`,
        ip: clientIp(req),
      },
    });
    const state = await getAccountState(g.user.id);
    return NextResponse.json({ ok: true, pnl: trade.pnl, ...state });
  } catch (e) {
    if (e instanceof TradeError) return fail(e.message, 422);
    console.error("[trades] close failed", e);
    return fail("Could not close the position. Please try again.", 500);
  }
}
