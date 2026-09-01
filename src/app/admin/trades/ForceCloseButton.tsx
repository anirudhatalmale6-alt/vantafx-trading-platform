"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client-api";

export function ForceCloseButton({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/admin/trades/close", { tradeId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (error) return <span className="text-xs text-bear-500">{error}</span>;

  // Closing books a real cash movement on a client's account, so it takes two clicks.
  return confirming ? (
    <span className="inline-flex gap-1.5">
      <button
        onClick={close}
        disabled={busy}
        className="rounded-md bg-bear-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {busy ? "Closing…" : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-md border border-ink-600 px-2.5 py-1 text-xs text-mist-300"
      >
        Cancel
      </button>
    </span>
  ) : (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md border border-ink-600 px-2.5 py-1 text-xs text-mist-300 hover:border-bear-500 hover:text-bear-500"
    >
      Force close
    </button>
  );
}
