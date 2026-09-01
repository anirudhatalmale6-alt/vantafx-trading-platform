import { quoteAll } from "@/lib/prices/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TICK_MS = 1000;

/**
 * Server-sent quote stream. Public, because the landing-page ticker uses it too.
 * One `data:` frame per second carrying every instrument.
 */
export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ quotes: quoteAll(), ts: Date.now() });
      const timer = setInterval(() => send({ quotes: quoteAll(), ts: Date.now() }), TICK_MS);

      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
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
      // Stops nginx buffering the stream into uselessness.
      "x-accel-buffering": "no",
    },
  });
}
