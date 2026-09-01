import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "vfx_session";
export const CSRF_COOKIE = "vfx_csrf";
export const CSRF_HEADER = "x-csrf-token";
const SESSION_DAYS = 7;

/**
 * Session cookies are Secure in production, which means the browser will only
 * send them back over HTTPS. Set SECURE_COOKIES=false when the app is genuinely
 * reachable over plain http (a demo box with no certificate) - otherwise sign-in
 * appears to succeed and then silently does nothing. Never set it on a public
 * deployment that has TLS.
 */
function secureCookies(): boolean {
  if (process.env.SECURE_COOKIES === "false") return false;
  if (process.env.SECURE_COOKIES === "true") return true;
  return process.env.NODE_ENV === "production";
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  role: string;
  status: string;
  balance: number;
  createdAt: Date;
};

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Only the SHA-256 of the cookie value is stored. A leaked database dump
 * therefore cannot be replayed as a live session.
 */
function tokenId(token: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return crypto.createHash("sha256").update(`${token}:${pepper}`).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const h = await headers();

  await db.session.create({
    data: {
      id: tokenId(token),
      userId,
      expiresAt,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires: expiresAt,
  });
  jar.set(CSRF_COOKIE, crypto.randomBytes(24).toString("base64url"), {
    httpOnly: false, // the browser has to read it to echo it back
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: tokenId(token) } });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

/** Invalidate every session for a user - used on password change and suspension. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/** Cached per request so a page can call it in several components for free. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: tokenId(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  // A suspended account keeps its row but loses access immediately.
  if (session.user.status !== "ACTIVE") return null;

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    country: u.country,
    role: u.role,
    status: u.status,
    balance: u.balance,
    createdAt: u.createdAt,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Deny by default: only the explicit ADMIN role gets through, never "not USER".
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function csrfToken(): Promise<string> {
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value ?? "";
}
