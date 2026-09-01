import "server-only";

/**
 * Market-news strip. Reads plain RSS feeds - no API key, no account - and caches
 * the result in memory so the dashboard never waits on a third party.
 */
export type NewsItem = { title: string; link: string; source: string; publishedAt: string | null };

const CACHE_MS = 10 * 60 * 1000;
const globalForNews = globalThis as unknown as {
  vfxNews?: { at: number; items: NewsItem[] };
};

function feedUrls(): string[] {
  return (process.env.NEWS_FEEDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tag(block, "title");
    const link = tag(block, "link");
    if (!title || !link) continue;
    const date = tag(block, "pubDate") ?? tag(block, "dc:date");
    const parsed = date ? new Date(date) : null;
    items.push({
      title,
      link,
      source,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    });
  }
  return items;
}

async function fetchFeed(url: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "VantaFX/1.0 (+news reader)", accept: "application/rss+xml, application/xml, text/xml" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return [];
  }
}

export async function getNews(limit = 12): Promise<NewsItem[]> {
  const cached = globalForNews.vfxNews;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.items.slice(0, limit);

  const urls = feedUrls();
  if (urls.length === 0) return [];

  const results = await Promise.all(urls.map(fetchFeed));
  const items = results
    .flat()
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 40);

  // Even an empty result is cached, so a broken feed is retried on a timer
  // rather than on every page view.
  globalForNews.vfxNews = { at: Date.now(), items };
  return items.slice(0, limit);
}
