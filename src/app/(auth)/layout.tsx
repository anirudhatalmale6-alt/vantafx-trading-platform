import Link from "next/link";
import { Logo } from "@/components/ui";
import { site } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/" aria-label="VantaFX home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-ink-800 px-4 py-6">
        <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-mist-500">{site.riskWarning}</p>
      </footer>
    </div>
  );
}
