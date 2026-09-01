/**
 * In-process pub/sub behind the support chat's server-sent-event streams.
 *
 * Single Node instance only - which is how the app ships. To run several
 * instances, replace publish/subscribe with a Redis pub/sub channel; the rest of
 * the chat code does not change.
 */
export type ChatEvent =
  | {
      type: "message";
      threadId: string;
      message: {
        id: string;
        body: string;
        fromAdmin: boolean;
        authorName: string;
        createdAt: string;
      };
    }
  | { type: "read"; threadId: string; byAdmin: boolean };

type Listener = (e: ChatEvent) => void;

const globalForBus = globalThis as unknown as { vfxChatListeners?: Set<Listener> };
const listeners = globalForBus.vfxChatListeners ?? new Set<Listener>();
globalForBus.vfxChatListeners = listeners;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publish(event: ChatEvent): void {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      // A dead stream must never break delivery to the others.
    }
  }
}
