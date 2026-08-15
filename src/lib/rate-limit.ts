/**
 * Fixed-window rate limiter for the API routes that stay public by design.
 *
 * Why those routes aren't auth-gated: the landing-page demo search and the map tile
 * overlay have to work before a visitor has an account — gating them would break the
 * first thing a new user sees. Every one of them proxies a *paid* Google API, so the
 * risk being defended here is quota burn and cost from an unauthenticated caller in a
 * loop, not data disclosure: none of these routes read or return user data.
 *
 * ponytail: in-memory, per-instance state. It resets on cold start and isn't shared
 * across serverless instances, so the real-world limit is (limit x instances). That is a
 * deliberate trade-off at this scale; the upgrade path is Upstash/Redis for one shared
 * counter, which needs no change to this function's signature.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Without this, one entry accumulates per unique IP and the map grows unbounded — a slow
 * memory leak on a long-lived instance. Swept lazily rather than on a timer, since a
 * serverless instance can be frozen or killed between requests and would never run one.
 */
function sweepExpired(now: number) {
  const expired: string[] = [];
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) expired.push(key);
  });
  expired.forEach((key) => buckets.delete(key));
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5_000) sweepExpired(now);
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/**
 * On Vercel the platform appends the real client IP to x-forwarded-for, so the first
 * entry is the closest thing to a caller identity available at the edge. It is
 * spoofable in principle; that is acceptable because this limiter guards cost, not
 * access — nothing behind these routes is sensitive, and everything that is sits
 * behind requireUserId() instead.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
