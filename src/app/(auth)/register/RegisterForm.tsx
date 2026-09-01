"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, cx } from "@/components/ui";
import { apiPost } from "@/lib/client-api";

/** Mirrors passwordSchema in src/lib/validation.ts - the server still decides. */
const RULES = [
  { label: "10 characters or more", test: (v: string) => v.length >= 10 },
  { label: "a lower-case letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "an upper-case letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "a digit", test: (v: string) => /[0-9]/.test(v) },
];

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", country: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(form.password) })), [form.password]);
  const passwordReady = checks.every((c) => c.ok);

  function set<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost<{ redirect: string }>("/api/auth/register", { ...form, acceptTerms: accepted });
      router.replace(res.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set("firstName")} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={set("lastName")} />
      </div>

      <Field label="Email" type="email" name="email" autoComplete="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
      <Field label="Country" name="country" autoComplete="country-name" value={form.country} onChange={set("country")} hint="Optional" />
      <Field label="Password" type="password" name="password" autoComplete="new-password" required value={form.password} onChange={set("password")} />

      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className={cx("flex items-center gap-1.5", c.ok ? "text-accent-400" : "text-mist-500")}>
            <span aria-hidden>{c.ok ? "✓" : "•"}</span>
            {c.label}
          </li>
        ))}
      </ul>

      <label className="flex items-start gap-2.5 text-sm text-mist-300">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-600 bg-ink-850 accent-[#22c07d]"
          required
        />
        <span>
          I understand this is a simulated trading environment and I have read the risk warning.
        </span>
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={busy || !accepted || !passwordReady}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
