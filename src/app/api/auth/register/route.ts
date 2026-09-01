import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return fail("Too many sign-up attempts. Try again later.", 429);

  // No CSRF cookie exists yet at sign-up, so same-origin is the control here.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return fail("Cross-origin request rejected", 403);
    } catch {
      return fail("Malformed Origin header", 403);
    }
  }

  const parsed = await parseBody(req, registerSchema);
  if ("response" in parsed) return parsed.response;
  const { firstName, lastName, email, password, country } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return fail("An account with that email already exists. Try signing in instead.", 409);
  }

  const user = await db.user.create({
    data: {
      email,
      firstName,
      lastName,
      country: country || null,
      passwordHash: await hashPassword(password),
      // Every new account starts with a simulated practice balance.
      balance: 10_000,
    },
  });

  await db.chatThread.create({ data: { userId: user.id } });
  await db.auditLog.create({ data: { actorId: user.id, action: "user.register", ip } });
  await createSession(user.id);

  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
