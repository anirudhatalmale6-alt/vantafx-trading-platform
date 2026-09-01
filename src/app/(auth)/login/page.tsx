import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-mist-500">Welcome back. Your terminal is one click away.</p>

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-sm text-mist-500">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-accent-400 hover:text-accent-500">
          Open one in under a minute
        </Link>
        .
      </p>
    </div>
  );
}
