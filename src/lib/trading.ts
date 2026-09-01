import "server-only";
import type { Trade } from "@prisma/client";
import { db } from "@/lib/db";
import { requireInstrument } from "@/lib/instruments";
import { computeMargin, computePnl, round2, type MidLookup } from "@/lib/pnl-math";
import { exitPrice, fillPrice, quote } from "@/lib/prices/engine";

export { round2 };

export type Side = "BUY" | "SELL";

/** Feeds the shared P/L maths from the server-side price engine. */
function midAt(atMs: number): MidLookup {
  return (symbol: string) => quote(symbol, atMs).mid;
}

/** Unrealised or realised P/L of a position, in USD. */
export function pnlUsd(
  symbol: string,
  side: Side,
  volume: number,
  openPrice: number,
  currentPrice: number,
  atMs: number = Date.now(),
): number {
  return computePnl(symbol, side, volume, openPrice, currentPrice, midAt(atMs));
}

/** Margin locked by a position, in USD. */
export function marginUsd(symbol: string, volume: number, atMs: number = Date.now()): number {
  return computeMargin(symbol, volume, midAt(atMs));
}

export type LiveTrade = {
  id: string;
  symbol: string;
  side: Side;
  volume: number;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  currentPrice: number;
  pnl: number;
  margin: number;
  openedAt: string;
};

export type AccountSummary = {
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number | null;
  openPnl: number;
  openCount: number;
};

export function decorate(trade: Trade, atMs: number = Date.now()): LiveTrade {
  const side = trade.side as Side;
  const current = exitPrice(trade.symbol, side, atMs);
  return {
    id: trade.id,
    symbol: trade.symbol,
    side,
    volume: trade.volume,
    openPrice: trade.openPrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    currentPrice: current,
    pnl: pnlUsd(trade.symbol, side, trade.volume, trade.openPrice, current, atMs),
    margin: marginUsd(trade.symbol, trade.volume, atMs),
    openedAt: trade.openedAt.toISOString(),
  };
}

export function summarise(balance: number, open: LiveTrade[]): AccountSummary {
  const openPnl = round2(open.reduce((s, t) => s + t.pnl, 0));
  const usedMargin = round2(open.reduce((s, t) => s + t.margin, 0));
  const equity = round2(balance + openPnl);
  return {
    balance: round2(balance),
    equity,
    usedMargin,
    freeMargin: round2(equity - usedMargin),
    marginLevel: usedMargin > 0 ? round2((equity / usedMargin) * 100) : null,
    openPnl,
    openCount: open.length,
  };
}

export async function getAccountState(userId: string, atMs: number = Date.now()) {
  const [user, openTrades] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { balance: true } }),
    db.trade.findMany({ where: { userId, status: "OPEN" }, orderBy: { openedAt: "desc" } }),
  ]);
  const open = openTrades.map((t) => decorate(t, atMs));
  return { open, summary: summarise(user?.balance ?? 0, open) };
}

export class TradeError extends Error {}

export type OpenTradeInput = {
  symbol: string;
  side: Side;
  volume: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

const MAX_OPEN_POSITIONS = 25;

export async function openTrade(userId: string, input: OpenTradeInput) {
  const inst = requireInstrument(input.symbol);
  const now = Date.now();
  const entry = fillPrice(inst.symbol, input.side, now);

  // Stops must sit on the correct side of the entry or the position would close
  // on the very next tick.
  const sl = input.stopLoss ?? null;
  const tp = input.takeProfit ?? null;
  if (sl !== null) {
    if (input.side === "BUY" && sl >= entry) throw new TradeError("Stop loss must be below the entry price for a buy");
    if (input.side === "SELL" && sl <= entry) throw new TradeError("Stop loss must be above the entry price for a sell");
  }
  if (tp !== null) {
    if (input.side === "BUY" && tp <= entry) throw new TradeError("Take profit must be above the entry price for a buy");
    if (input.side === "SELL" && tp >= entry) throw new TradeError("Take profit must be below the entry price for a sell");
  }

  const { summary, open } = await getAccountState(userId, now);
  if (open.length >= MAX_OPEN_POSITIONS) {
    throw new TradeError(`You already have ${MAX_OPEN_POSITIONS} open positions`);
  }
  const required = marginUsd(inst.symbol, input.volume, now);
  if (required > summary.freeMargin) {
    throw new TradeError(
      `Not enough free margin. This position needs $${required.toFixed(2)} and you have $${summary.freeMargin.toFixed(2)} available.`,
    );
  }

  return db.trade.create({
    data: {
      userId,
      symbol: inst.symbol,
      side: input.side,
      volume: input.volume,
      openPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      status: "OPEN",
    },
  });
}

export async function closeTrade(
  tradeId: string,
  opts: { userId?: string; closeType?: string } = {},
) {
  const now = Date.now();
  const trade = await db.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new TradeError("Position not found");
  // Ownership is checked here, not only in the route, so no caller can skip it.
  if (opts.userId && trade.userId !== opts.userId) throw new TradeError("Position not found");
  if (trade.status !== "OPEN") throw new TradeError("Position is already closed");

  const side = trade.side as Side;
  const close = exitPrice(trade.symbol, side, now);
  const pnl = pnlUsd(trade.symbol, side, trade.volume, trade.openPrice, close, now);

  // One transaction: a position can never be booked without its cash movement.
  const [updated] = await db.$transaction([
    db.trade.update({
      where: { id: trade.id },
      data: {
        status: "CLOSED",
        closePrice: close,
        closedAt: new Date(now),
        closeType: opts.closeType ?? "MANUAL",
        pnl,
      },
    }),
    db.user.update({
      where: { id: trade.userId },
      data: { balance: { increment: pnl } },
    }),
  ]);
  return updated;
}

/**
 * Closes any open position whose stop loss or take profit has been reached.
 * Run from the background ticker in src/instrumentation.ts so it happens even
 * when the owner of the position has the browser shut.
 */
export async function sweepStopsAndTargets(): Promise<number> {
  const now = Date.now();
  const open = await db.trade.findMany({
    where: { status: "OPEN", OR: [{ stopLoss: { not: null } }, { takeProfit: { not: null } }] },
  });

  let closed = 0;
  for (const trade of open) {
    const side = trade.side as Side;
    const price = exitPrice(trade.symbol, side, now);
    let reason: string | null = null;
    if (side === "BUY") {
      if (trade.stopLoss !== null && price <= trade.stopLoss) reason = "STOP_LOSS";
      else if (trade.takeProfit !== null && price >= trade.takeProfit) reason = "TAKE_PROFIT";
    } else {
      if (trade.stopLoss !== null && price >= trade.stopLoss) reason = "STOP_LOSS";
      else if (trade.takeProfit !== null && price <= trade.takeProfit) reason = "TAKE_PROFIT";
    }
    if (!reason) continue;
    try {
      await closeTrade(trade.id, { closeType: reason });
      closed++;
    } catch {
      // Already closed by a concurrent request - nothing to do.
    }
  }
  return closed;
}
