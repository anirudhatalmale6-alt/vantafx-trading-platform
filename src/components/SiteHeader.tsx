import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Logo, buttonClass } from "@/components/ui";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0" aria-label="VantaFX home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-mist-300 md:flex">
          <Link href="/#platform" className="hover:text-mist-100">
            Platform
          </Link>
          <Link href="/#markets" className="hover:text-mist-100">
            Markets
          </Link>
          <Link href="/#security" className="hover:text-mist-100">
            Security
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className={buttonClass("primary", "sm")}>
              {user.role === "ADMIN" ? "Admin dashboard" : "Open terminal"}
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>
                Open account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
