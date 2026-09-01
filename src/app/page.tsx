import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MarketTicker } from "@/components/prices/MarketTicker";
import { RatesGrid } from "@/components/prices/RatesGrid";
import { buttonClass } from "@/components/ui";
import { site } from "@/lib/site";

const PLATFORM = [
  {
    title: "One-click execution",
    body: "Buy or sell any pair from a single ticket. Lot size, stop loss and take profit sit on one screen - no nested menus, no reloads.",
  },
  {
    title: "Positions that update live",
    body: "Open trades revalue on every tick. Floating P/L, used margin and free margin are always in front of you, never a page refresh away.",
  },
  {
    title: "Stops that work while you sleep",
    body: "Stop loss and take profit are evaluated on the server every few seconds, so a level triggers whether or not your browser is open.",
  },
  {
    title: "Support inside the platform",
    body: "The client area carries a live chat straight to the desk. Messages arrive instantly in both directions - no ticket queue, no email.",
  },
];

const SECURITY = [
  ["Passwords", "Hashed with bcrypt at cost 12. Never stored, logged or emailed in plain text."],
  ["Sessions", "HttpOnly, SameSite cookies. Only a hash of the token reaches the database, so a dump cannot be replayed."],
  ["Forms", "Every state-changing request carries a CSRF token and is checked for same-origin."],
  ["Brute force", "Sign-in is rate limited per IP and per account, and every attempt is written to an audit log."],
  ["Headers", "Strict CSP, no framing, no MIME sniffing, referrer trimmed on cross-origin navigation."],
  ["Access", "Role checks deny by default - an ordinary session cannot reach an admin route even by guessing the URL."],
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <MarketTicker />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_0%,rgba(34,192,125,0.16),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center rounded-full border border-ink-600 bg-ink-900 px-3 py-1 text-xs font-medium text-mist-300">
                Simulated trading environment
              </span>
              <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
                Trade the world&rsquo;s currencies from{" "}
                <span className="text-accent-400">one clean terminal</span>.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-mist-300">
                Register, sign in and you are on the chart. Eleven instruments, a live quote stream, an order ticket
                that fits on one screen and a support desk built into the client area.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className={buttonClass("primary", "lg")}>
                  Open a free account
                </Link>
                <Link href="/login" className={buttonClass("outline", "lg")}>
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-xs text-mist-500">
                No deposit. Every account starts with a simulated $10,000 practice balance.
              </p>
            </div>

            <div className="lg:pl-4">
              <RatesGrid />
            </div>
          </div>
        </section>

        <section id="platform" className="border-t border-ink-800 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Built around the trade ticket</h2>
            <p className="mt-2 max-w-2xl text-mist-300">
              The platform does a small number of things and does them without ceremony.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {PLATFORM.map((f) => (
                <div key={f.title} className="rounded-xl border border-ink-700 bg-ink-900 p-5">
                  <h3 className="font-semibold text-mist-100">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-300">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="markets" className="border-t border-ink-800 bg-ink-900/40 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Markets</h2>
            <p className="mt-2 max-w-2xl text-mist-300">
              Seven majors, three crosses and gold. Quotes stream over a single connection at one tick a second.
            </p>
            <div className="mt-8">
              <RatesGrid />
            </div>
          </div>
        </section>

        <section id="security" className="border-t border-ink-800 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold tracking-tight">Hardened where it counts</h2>
            <p className="mt-2 max-w-2xl text-mist-300">
              Nothing exotic - just the controls a platform holding client accounts is expected to have.
            </p>
            <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY.map(([term, detail]) => (
                <div key={term}>
                  <dt className="text-sm font-semibold text-accent-400">{term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-mist-300">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-ink-800 bg-ink-900/40 py-14">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Ready to place your first trade?</h2>
              <p className="mt-1 text-sm text-mist-300">{site.supportHours}.</p>
            </div>
            <Link href="/register" className={buttonClass("primary", "lg")}>
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
