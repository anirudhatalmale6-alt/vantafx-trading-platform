import Link from "next/link";
import { Logo } from "@/components/ui";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-mist-500">{site.tagline}</p>
          </div>
          <nav className="flex flex-wrap gap-x-10 gap-y-2 text-sm text-mist-300">
            <Link href="/register" className="hover:text-mist-100">
              Open account
            </Link>
            <Link href="/login" className="hover:text-mist-100">
              Sign in
            </Link>
            <Link href="/#security" className="hover:text-mist-100">
              Security
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-ink-800 pt-6 text-xs leading-relaxed text-mist-500">
          <strong className="text-mist-300">Risk warning.</strong> {site.riskWarning}
        </p>
        <p className="mt-3 text-xs text-mist-500">
          © {new Date().getFullYear()} {site.legalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
