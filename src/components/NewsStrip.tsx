import type { NewsItem } from "@/lib/news";

function ago(iso: string | null): string {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Market headlines from plain RSS. Renders nothing at all when no feed is
 * configured or reachable - an empty box would read as a broken feature.
 */
export function NewsStrip({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-3 pb-6 sm:px-4">
      <div className="rounded-xl border border-ink-700 bg-ink-900">
        <header className="border-b border-ink-700 px-4 py-2.5">
          <h2 className="text-xs font-semibold tracking-wide text-mist-300 uppercase">Market news</h2>
        </header>
        <ul className="divide-y divide-ink-800/70">
          {items.map((item) => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-baseline justify-between gap-4 px-4 py-2.5 hover:bg-ink-850"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-mist-100">{item.title}</span>
                <span className="shrink-0 text-xs text-mist-500">
                  {item.source} · {ago(item.publishedAt)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
