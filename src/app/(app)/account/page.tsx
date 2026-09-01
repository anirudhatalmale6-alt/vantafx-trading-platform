import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, Stat } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();

  const [openCount, closedCount, realised] = await Promise.all([
    db.trade.count({ where: { userId: user.id, status: "OPEN" } }),
    db.trade.count({ where: { userId: user.id, status: "CLOSED" } }),
    db.trade.aggregate({ where: { userId: user.id, status: "CLOSED" }, _sum: { pnl: true } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-mist-500">Review your details, keep them current and change your password.</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={`$${user.balance.toFixed(2)}`} />
        <Stat label="Open positions" value={openCount} />
        <Stat label="Closed trades" value={closedCount} />
        <Stat
          label="Realised P/L"
          value={`${(realised._sum.pnl ?? 0) >= 0 ? "+" : "−"}$${Math.abs(realised._sum.pnl ?? 0).toFixed(2)}`}
          tone={(realised._sum.pnl ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Your details">
          <div className="p-4">
            <dl className="mb-5 space-y-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Email</dt>
                <dd className="truncate text-mist-100">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Account ID</dt>
                <dd className="tabular truncate text-mist-300">{user.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Member since</dt>
                <dd className="text-mist-300">
                  {user.createdAt.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })}
                </dd>
              </div>
            </dl>
            <p className="mb-4 text-xs text-mist-500">
              Your email address is the key to the account, so it is changed by the support desk rather than here.
            </p>
            <ProfileForm
              initial={{
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone ?? "",
                country: user.country ?? "",
              }}
            />
          </div>
        </Card>

        <Card title="Password">
          <div className="p-4">
            <p className="mb-4 text-xs text-mist-500">
              Changing your password signs out every other device. You stay signed in here.
            </p>
            <PasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
