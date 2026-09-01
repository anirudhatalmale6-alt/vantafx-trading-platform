import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { CSRF_COOKIE, CSRF_HEADER, getCurrentUser, type SessionUser } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Double-submit CSRF check plus a same-origin assertion. Both are cheap and they
 * fail closed - a request missing either one is rejected.
 */
export async function assertCsrf(req: Request): Promise<string | null> {
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("host");
    try {
      if (new URL(origin).host !== host) return "Cross-origin request rejected";
    } catch {
      return "Malformed Origin header";
    }
  }

  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return "Invalid or missing CSRF token";
  }
  return null;
}

type GuardOptions = {
  admin?: boolean;
  csrf?: boolean;
  limit?: { key: string; max: number; windowMs: number };
};

export type Guarded = { user: SessionUser } | { response: NextResponse };

export function isDenied(g: Guarded): g is { response: NextResponse } {
  return "response" in g;
}

/** One call that covers rate limiting, CSRF and authorisation for a route handler. */
export async function guard(req: Request, opts: GuardOptions = {}): Promise<Guarded> {
  if (opts.limit) {
    const r = rateLimit(`${opts.limit.key}:${clientIp(req)}`, opts.limit.max, opts.limit.windowMs);
    if (!r.ok) {
      return {
        response: fail("Too many requests, please slow down.", 429, { retryAfter: r.retryAfter }),
      };
    }
  }

  if (opts.csrf !== false && req.method !== "GET" && req.method !== "HEAD") {
    const err = await assertCsrf(req);
    if (err) return { response: fail(err, 403) };
  }

  const user = await getCurrentUser();
  if (!user) return { response: fail("Not signed in", 401) };
  if (opts.admin && user.role !== "ADMIN") return { response: fail("Forbidden", 403) };

  return { user };
}

export async function parseBody<T extends ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: fail("Expected a JSON body") };
  }
  try {
    return { data: schema.parse(raw) as z.infer<T> };
  } catch (e) {
    const issue = e instanceof ZodError ? e.errors[0]?.message : null;
    return { response: fail(issue ?? "Invalid input") };
  }
}
