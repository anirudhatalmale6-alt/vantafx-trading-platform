"use client";

/** Reads the double-submit CSRF cookie the session layer set at login. */
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)vfx_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken(),
    },
    body: JSON.stringify(body ?? {}),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* an empty body is fine */
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return payload as T;
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
  return (await res.json()) as T;
}
