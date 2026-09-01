"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, EmptyState, cx } from "@/components/ui";
import { apiGet } from "@/lib/client-api";
import { ChatPanel } from "@/components/chat/ChatPanel";

type Thread = {
  id: string;
  unread: number;
  lastMessageAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; status: string };
  preview: { body: string; fromAdmin: boolean; createdAt: string } | null;
};

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function ChatConsole() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ threads: Thread[] }>("/api/admin/threads");
      setThreads(res.threads);
      setSelected((current) => current ?? res.threads[0]?.id ?? null);
    } catch {
      setThreads([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The admin stream carries every thread, so any incoming message is a reason
  // to refresh the list ordering and the unread counters.
  useEffect(() => {
    const source = new EventSource("/api/chat/stream");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string };
        if (payload.type === "message" || payload.type === "read") void load();
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => source.close();
  }, [load]);

  const active = threads?.find((t) => t.id === selected) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
        <header className="border-b border-ink-700 px-4 py-2.5">
          <h2 className="text-xs font-semibold tracking-wide text-mist-300 uppercase">Conversations</h2>
        </header>

        {threads === null ? (
          <EmptyState title="Loading conversations…" />
        ) : threads.length === 0 ? (
          <EmptyState title="No conversations yet" body="A thread appears here as soon as a client writes in." />
        ) : (
          <ul className="max-h-[560px] divide-y divide-ink-800/70 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t.id)}
                  className={cx(
                    "w-full px-4 py-3 text-left transition-colors",
                    t.id === selected ? "bg-ink-800" : "hover:bg-ink-850",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-mist-100">
                      {t.user.firstName} {t.user.lastName}
                    </span>
                    <span className="shrink-0 text-[11px] text-mist-500">{ago(t.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs text-mist-500">{t.user.email}</p>
                  {t.preview && (
                    <p className="mt-1 truncate text-xs text-mist-300">
                      {t.preview.fromAdmin ? "You: " : ""}
                      {t.preview.body}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {t.unread > 0 && <Badge tone="good">{t.unread} new</Badge>}
                    {t.user.status !== "ACTIVE" && <Badge tone="bad">{t.user.status}</Badge>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active ? (
        <ChatPanel
          key={active.id}
          threadId={active.id}
          asAdmin
          className="h-[560px]"
          emptyHint={`No messages from ${active.user.firstName} yet.`}
        />
      ) : (
        <div className="flex h-[560px] items-center justify-center rounded-xl border border-ink-700 bg-ink-900">
          <p className="text-sm text-mist-500">Select a conversation to reply.</p>
        </div>
      )}
    </div>
  );
}
