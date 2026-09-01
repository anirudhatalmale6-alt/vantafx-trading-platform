"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field } from "@/components/ui";
import { apiPost } from "@/lib/client-api";

type Profile = { firstName: string; lastName: string; phone: string; country: string };

export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Profile>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      await apiPost("/api/account/profile", form);
      setStatus({ kind: "success", text: "Your details have been saved." });
      // The header greeting reads from the server, so refresh it too.
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Could not save your details" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {status && <Alert kind={status.kind}>{status.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required value={form.firstName} onChange={set("firstName")} autoComplete="given-name" />
        <Field label="Last name" required value={form.lastName} onChange={set("lastName")} autoComplete="family-name" />
      </div>
      <Field label="Phone" value={form.phone} onChange={set("phone")} autoComplete="tel" hint="Optional" />
      <Field label="Country" value={form.country} onChange={set("country")} autoComplete="country-name" hint="Optional" />

      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
