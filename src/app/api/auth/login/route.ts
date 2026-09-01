import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const parsed = await parseBody(req, loginSchema);
  if ("response" in parsed) return parsed.response;
  const { email, password } = parsed.data;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return fail("Cross-origin request rejected", 403);
    } catch {
      return fail("Malformed Origin header", 403);
    }
  }

  // Two windows: one stops a burst from a single IP, the other stops a slow
  // grind against one specific account from a rotating set of IPs.
  const byIp = rateLimit(`login-ip:${ip}`, 10, 10 * 60 * 1000);
  const byAccount = rateLimit(`login-acct:${email}`, 8, 15 * 60 * 1000);
  if (!byIp.ok || !byAccount.ok) {
    return fail("Too many sign-in attempts. Please wait a few minutes and try again.", 429);
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always run a comparison so a missing account and a wrong password take the
  // same amount of time; the response text is identical for the same reason.
  const dummy = "$2a$12$1GpqrKvhjBu6ieo7RELwl.g7Fz0yPM4s9/MUklLL4KHUfSzGElDqe";
  const ok = await verifyPassword(password, user?.passwordHash ?? dummy);

  if (!user || !ok) {
    await db.auditLog.create({ data: { action: "user.login.failed", detail: email, ip } });
    return fail("Email or password is incorrect.", 401);
  }
  if (user.status !== "ACTIVE") {
    return fail("This account has been suspended. Please contact support.", 403);
  }

  await createSession(user.id);
  await db.auditLog.create({ data: { actorId: user.id, action: "user.login", ip } });

  return NextResponse.json({
    ok: true,
    redirect: user.role === "ADMIN" ? "/admin" : "/dashboard",
  });
}
