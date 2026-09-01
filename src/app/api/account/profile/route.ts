import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isDenied, parseBody } from "@/lib/api";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await guard(req, { limit: { key: "profile", max: 20, windowMs: 60_000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, profileSchema);
  if ("response" in parsed) return parsed.response;
  const { firstName, lastName, phone, country } = parsed.data;

  // Email and balance are deliberately not editable here - changing either is an
  // admin action, so a compromised session cannot quietly move the account.
  const user = await db.user.update({
    where: { id: g.user.id },
    data: { firstName, lastName, phone: phone || null, country: country || null },
    select: { firstName: true, lastName: true, phone: true, country: true },
  });

  await db.auditLog.create({ data: { actorId: g.user.id, action: "account.profile.update" } });
  return NextResponse.json({ ok: true, user });
}
