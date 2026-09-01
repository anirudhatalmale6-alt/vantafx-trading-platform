"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, buttonClass, cx } from "@/components/ui";
import { apiPost } from "@/lib/client-api";

export type NavItem = { href: string; label: string; badge?: number };

export function AppNav({
  items,
  userLabel,
  homeHref,
}: {
  items: NavItem[];
  userLabel: string;
  homeHref: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await apiPost("/api/auth/logout");
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const links = items.map((item) => {
    const active = pathname === item.href || (item.href !== homeHref && pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cx(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          active ? "bg-ink-800 font-medium text-mist-100" : "text-mist-300 hover:bg-ink-850 hover:text-mist-100",
        )}
      >
        {item.label}
        {item.badge ? (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-semibold text-ink-950">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <Link href={homeHref} aria-label="Home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">{links}</nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-mist-500 sm:inline">{userLabel}</span>
          <button onClick={signOut} disabled={busy} className={buttonClass("outline", "sm")}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className={buttonClass("ghost", "sm", "md:hidden")}
          >
            ☰
          </button>
        </div>
      </div>

      {open && <nav className="flex flex-col gap-1 border-t border-ink-800 px-4 py-3 md:hidden">{links}</nav>}
    </header>
  );
}
