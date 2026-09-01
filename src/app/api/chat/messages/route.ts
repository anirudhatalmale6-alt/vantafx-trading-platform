import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { chatMessageSchema } from "@/lib/validation";
import { ensureThread, loadMessages, markRead, postMessage } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolves which thread the caller is allowed to act on.
 * A normal user always gets their own, whatever they asked for.
 */
async function resolveThread(userId: string, role: string, requestedThreadId?: string | null) {
  if (role === "ADMIN" && requestedThreadId) {
    return db.chatThread.findUnique({ where: { id: requestedThreadId } });
  }
  return ensureThread(userId);
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (isDenied(g)) return g.response;

  const url = new URL(req.url);
  const thread = await resolveThread(g.user.id, g.user.role, url.searchParams.get("threadId"));
  if (!thread) return fail("Conversation not found", 404);

  const messages = await loadMessages(thread.id);
  const viewerIsAdmin = g.user.role === "ADMIN" && thread.userId !== g.user.id;
  if ((viewerIsAdmin ? thread.unreadForAdmin : thread.unreadForUser) > 0) {
    await markRead(thread.id, viewerIsAdmin);
  }

  return NextResponse.json({ threadId: thread.id, messages });
}

export async function POST(req: Request) {
  const g = await guard(req, { limit: { key: "chat-post", max: 30, windowMs: 60_000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, chatMessageSchema);
  if ("response" in parsed) return parsed.response;

  const thread = await resolveThread(g.user.id, g.user.role, parsed.data.threadId);
  if (!thread) return fail("Conversation not found", 404);

  const fromAdmin = g.user.role === "ADMIN" && thread.userId !== g.user.id;
  const message = await postMessage({
    threadId: thread.id,
    authorId: g.user.id,
    authorName: `${g.user.firstName} ${g.user.lastName}`.trim(),
    fromAdmin,
    body: parsed.data.body,
  });

  return NextResponse.json({ ok: true, message, threadId: thread.id });
}
