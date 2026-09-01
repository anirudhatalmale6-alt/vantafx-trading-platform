import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, guard, isDenied, parseBody } from "@/lib/api";
import { destroyAllSessions } from "@/lib/auth";
import { adminUserUpdateSchema } from "@/lib/validation";
import { clientIp } from "@/lib/rate-limit";
import { round2 } from "@/lib/trading";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await guard(req, { admin: true, limit: { key: "admin-users", max: 60, windowMs: 60_000 } });
  if (isDenied(g)) return g.response;

  const parsed = await parseBody(req, adminUserUpdateSchema);
  if ("response" in parsed) return parsed.response;
  const { userId, status, role, balanceAdjustment } = parsed.data;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return fail("User not found", 404);

  // An admin must not be able to lock themselves out or demote themselves by
  // accident - both are one-way doors from inside the dashboard.
  if (target.id === g.user.id && (status === "SUSPENDED" || role === "USER")) {
    return fail("You cannot suspend or demote your own account.", 422);
  }
  if (target.role === "ADMIN" && role === "USER") {
    const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) return fail("This is the last active admin account.", 422);
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(balanceAdjustment ? { balance: { increment: round2(balanceAdjustment) } } : {}),
    },
    select: { id: true, status: true, role: true, balance: true },
  });

  // Suspension has to bite immediately, not when the cookie happens to expire.
  if (status === "SUSPENDED") await destroyAllSessions(userId);

  await db.auditLog.create({
    data: {
      actorId: g.user.id,
      action: "admin.user.update",
      targetId: userId,
      detail: JSON.stringify({ status, role, balanceAdjustment }),
      ip: clientIp(req),
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
