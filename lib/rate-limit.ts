type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Lightweight in-memory rate limiter (per process).
 * For multi-instance deployments, swap with a Postgres or Redis backed limiter.
 */
export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: options.limit - 1, resetAt: fresh.resetAt };
  }
  existing.count += 1;
  const ok = existing.count <= options.limit;
  return { ok, remaining: Math.max(0, options.limit - existing.count), resetAt: existing.resetAt };
}

export function clientKey(req: Request, prefix = ""): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `${prefix}:${ip}`;
}
