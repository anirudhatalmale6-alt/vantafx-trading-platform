"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, cx } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/client-api";

export type ChatMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  authorName: string;
  createdAt: string;
};

type StreamEvent =
  | { type: "ready"; threadId: string | null }
  | { type: "message"; threadId: string; message: ChatMessage }
  | { type: "read"; threadId: string; byAdmin: boolean };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Live support conversation. Used by both the client area and the admin console;
 * `asAdmin` only changes which side of the bubble is "mine" and which thread the
 * message is posted into.
 */
export function ChatPanel({
  threadId,
  asAdmin = false,
  emptyHint,
  className,
}: {
  threadId?: string | null;
  asAdmin?: boolean;
  emptyHint?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const activeThread = useRef<string | null>(threadId ?? null);
  const scroller = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = threadId ? `/api/chat/messages?threadId=${encodeURIComponent(threadId)}` : "/api/chat/messages";
      const res = await apiGet<{ threadId: string; messages: ChatMessage[] }>(url);
      activeThread.current = res.threadId;
      setMessages(res.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the conversation");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  // One stream serves every thread the viewer is allowed to see; filter here.
  useEffect(() => {
    const source = new EventSource("/api/chat/stream");
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      let payload: StreamEvent;
      try {
        payload = JSON.parse(event.data) as StreamEvent;
      } catch {
        return;
      }
      if (payload.type === "ready") {
        if (!activeThread.current) activeThread.current = payload.threadId;
        return;
      }
      if (payload.type !== "message") return;
      if (activeThread.current && payload.threadId !== activeThread.current) return;

      setMessages((prev) => (prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]));
    };
    return () => source.close();
  }, [threadId]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiPost<{ message: ChatMessage; threadId: string }>("/api/chat/messages", {
        body,
        ...(threadId ? { threadId } : {}),
      });
      activeThread.current = res.threadId;
      // The stream echoes this back too; dedupe on id.
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message not sent");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cx("flex flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900", className)}>
      <header className="flex items-center justify-between border-b border-ink-700 px-4 py-2.5">
        <h2 className="text-xs font-semibold tracking-wide text-mist-300 uppercase">
          {asAdmin ? "Conversation" : "Support desk"}
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-mist-500">
          <span className={cx("h-1.5 w-1.5 rounded-full", live ? "bg-accent-500" : "bg-warn-500")} />
          {live ? "Connected" : "Reconnecting"}
        </span>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-mist-500">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-mist-500">{emptyHint ?? "No messages yet. Say hello and the desk will reply."}</p>
        ) : (
          messages.map((m) => {
            const mine = asAdmin ? m.fromAdmin : !m.fromAdmin;
            return (
              <div key={m.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[85%] rounded-xl px-3 py-2 sm:max-w-[70%]",
                    mine ? "bg-accent-500/15 text-mist-100" : "bg-ink-800 text-mist-100",
                  )}
                >
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-xs font-medium text-mist-300">{m.authorName}</span>
                    <span className="text-[11px] text-mist-500">{fmtTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="px-4 pb-2">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-ink-700 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line - what people expect from a chat box.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as React.FormEvent);
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={asAdmin ? "Reply to this client…" : "Type your message…"}
          className="max-h-32 min-h-[42px] flex-1 resize-y rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60"
        />
        <Button type="submit" disabled={sending || draft.trim().length === 0}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
