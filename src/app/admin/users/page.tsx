import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UsersTable } from "./UsersTable";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const users = await db.user.findMany({
    where: term
      ? {
          OR: [
            { email: { contains: term } },
            { firstName: { contains: term } },
            { lastName: { contains: term } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      phone: true,
      role: true,
      status: true,
      balance: true,
      createdAt: true,
      _count: { select: { trades: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-mist-500">
        Suspend an account, adjust a practice balance, or promote a colleague to admin.
      </p>

      <div className="mt-5">
        <UsersTable
          currentAdminId={admin.id}
          initialQuery={term}
          users={users.map((u) => ({
            id: u.id,
            email: u.email,
            name: `${u.firstName} ${u.lastName}`.trim(),
            country: u.country,
            phone: u.phone,
            role: u.role,
            status: u.status,
            balance: u.balance,
            trades: u._count.trades,
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
