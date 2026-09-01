import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { closeTradeSchema } from "@/lib/validation";
import { TradeError, closeTrade } from "@/lib/trading";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Force-close a client's position from the admin dashboard. */
export async function POST(req: Request) {
  const g = await guard(req, { admin: true });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, closeTradeSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const trade = await closeTrade(parsed.data.tradeId, { closeType: "ADMIN" });
    await db.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "admin.trade.close",
        targetId: trade.id,
        detail: `${trade.symbol} pnl ${trade.pnl}`,
        ip: clientIp(req),
      },
    });
    return NextResponse.json({ ok: true, pnl: trade.pnl });
  } catch (e) {
    if (e instanceof TradeError) return fail(e.message, 422);
    console.error("[admin] force close failed", e);
    return fail("Could not close the position.", 500);
  }
}
