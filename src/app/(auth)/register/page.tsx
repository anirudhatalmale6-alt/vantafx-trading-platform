import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Open an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">Open an account</h1>
      <p className="mt-1 text-sm text-mist-500">
        Takes a minute. You will land straight in the terminal with a $10,000 practice balance.
      </p>

      <div className="mt-6">
        <RegisterForm />
      </div>

      <p className="mt-6 text-sm text-mist-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent-400 hover:text-accent-500">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
