import { getCurrentUser } from "@/lib/auth";
import { ensureThread } from "@/lib/chat";
import { subscribe } from "@/lib/chat-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live chat delivery. A client only ever receives events for their own thread;
 * an admin receives every thread so the inbox lights up without polling.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const isAdmin = user.role === "ADMIN";
  const ownThread = isAdmin ? null : await ensureThread(user.id);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ type: "ready", threadId: ownThread?.id ?? null });

      const unsubscribe = subscribe((event) => {
        if (!isAdmin && event.threadId !== ownThread?.id) return;
        send(event);
      });

      // Comment frames keep proxies from timing the connection out.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          closed = true;
        }
      }, 25_000);

      const stop = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already torn down */
        }
      };

      req.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
