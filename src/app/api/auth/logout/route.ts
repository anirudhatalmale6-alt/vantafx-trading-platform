import { NextResponse } from "next/server";
import { assertCsrf, fail } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const err = await assertCsrf(req);
  if (err) return fail(err, 403);
  await destroySession();
  return NextResponse.json({ ok: true, redirect: "/" });
}
