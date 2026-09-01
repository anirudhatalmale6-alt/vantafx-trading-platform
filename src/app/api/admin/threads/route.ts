import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isDenied } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inbox list for the admin chat console. */
export async function GET(req: Request) {
  const g = await guard(req, { admin: true });
  if (isDenied(g)) return g.response;

  const threads = await db.chatThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, fromAdmin: true, createdAt: true } },
    },
  });

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      unread: t.unreadForAdmin,
      lastMessageAt: t.lastMessageAt.toISOString(),
      user: t.user,
      preview: t.messages[0]
        ? { body: t.messages[0].body, fromAdmin: t.messages[0].fromAdmin, createdAt: t.messages[0].createdAt.toISOString() }
        : null,
    })),
  });
}
