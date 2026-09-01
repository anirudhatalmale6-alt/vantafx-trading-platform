import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { createSession, destroyAllSessions, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await guard(req, { limit: { key: "password", max: 6, windowMs: 15 * 60 * 1000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, changePasswordSchema);
  if ("response" in parsed) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const record = await db.user.findUnique({ where: { id: g.user.id }, select: { passwordHash: true } });
  if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) {
    return fail("Your current password is not correct.", 403);
  }
  if (await verifyPassword(newPassword, record.passwordHash)) {
    return fail("The new password must be different from the current one.", 422);
  }

  await db.user.update({
    where: { id: g.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Changing a password must end every other session, otherwise a stolen cookie
  // survives the very event meant to revoke it. Then re-issue one for this browser.
  await destroyAllSessions(g.user.id);
  await createSession(g.user.id);

  await db.auditLog.create({ data: { actorId: g.user.id, action: "account.password.change" } });
  return NextResponse.json({ ok: true });
}
