"use client";

import { useState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { apiPost } from "@/lib/client-api";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPassword !== confirm) {
      setStatus({ kind: "error", text: "The two new passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/account/password", { currentPassword, newPassword });
      setStatus({ kind: "success", text: "Password changed. Other devices have been signed out." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Could not change your password" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {status && <Alert kind={status.kind}>{status.text}</Alert>}

      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        hint="At least 10 characters, with upper case, lower case and a digit."
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <Button type="submit" disabled={busy}>
        {busy ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
