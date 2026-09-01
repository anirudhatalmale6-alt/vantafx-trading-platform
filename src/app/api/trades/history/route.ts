import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isDenied } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isDenied(g)) return g.response;

  const url = new URL(req.url);
  const take = Math.min(Math.max(Number(url.searchParams.get("take") ?? 50) || 50, 1), 200);

  const trades = await db.trade.findMany({
    where: { userId: g.user.id, status: "CLOSED" },
    orderBy: { closedAt: "desc" },
    take,
  });

  return NextResponse.json({ trades });
}
