/**
 * Small in-process sliding-window limiter. Enough for a single Node instance,
 * which is how this app is deployed; behind several instances swap the Map for
 * Redis and keep the same call signature.
 */
type Bucket = { hits: number[] };

const globalForLimiter = globalThis as unknown as { vfxBuckets?: Map<string, Bucket> };
const buckets = globalForLimiter.vfxBuckets ?? new Map<string, Bucket>();
globalForLimiter.vfxBuckets = buckets;

let lastSweep = Date.now();

export type RateLimitResult = { ok: boolean; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the Map cannot grow without bound.
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) {
      if (b.hits.length === 0 || now - b.hits[b.hits.length - 1] > 3_600_000) buckets.delete(k);
    }
    lastSweep = now;
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const retryAfter = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
