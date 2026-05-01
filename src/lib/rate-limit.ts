/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limiter = rateLimit({ interval: 60_000, limit: 10 });
 *
 *   export async function POST(req: Request) {
 *     const ip = req.headers.get("x-forwarded-for") ?? "unknown";
 *     const { success } = limiter.check(ip);
 *     if (!success) return new Response("Too many requests", { status: 429 });
 *     // ... handle request
 *   }
 */

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60 000 = 1 minute) */
  interval?: number;
  /** Max requests per window (default: 10) */
  limit?: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface TokenBucket {
  timestamps: number[];
}

export function rateLimit(opts: RateLimitOptions = {}) {
  const interval = opts.interval ?? 60_000;
  const limit = opts.limit ?? 10;
  const buckets = new Map<string, TokenBucket>();

  // Periodic cleanup to prevent memory leaks
  const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    const cutoff = now - interval;
    for (const [key, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) buckets.delete(key);
    }
  }

  function check(key: string): RateLimitResult {
    cleanup();
    const now = Date.now();
    const cutoff = now - interval;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    // Remove expired timestamps
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= limit) {
      const oldestInWindow = bucket.timestamps[0];
      return {
        success: false,
        remaining: 0,
        reset: oldestInWindow + interval,
      };
    }

    bucket.timestamps.push(now);
    return {
      success: true,
      remaining: limit - bucket.timestamps.length,
      reset: now + interval,
    };
  }

  return { check };
}

/**
 * Pre-configured limiters for common use cases.
 */

/** Auth endpoints: 5 requests per minute per IP */
export const authLimiter = rateLimit({ interval: 60_000, limit: 5 });

/** General API: 30 requests per minute per IP */
export const apiLimiter = rateLimit({ interval: 60_000, limit: 30 });

/** Contact/email forms: 3 per minute per IP */
export const contactLimiter = rateLimit({ interval: 60_000, limit: 3 });

/** Sensitive operations (password reset, etc.): 3 per 5 minutes per IP */
export const sensitiveLimiter = rateLimit({ interval: 300_000, limit: 3 });

/**
 * Helper to extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Helper to create a 429 response with retry-after header.
 */
export function tooManyRequestsResponse(reset?: number): Response {
  const retryAfter = reset ? Math.ceil((reset - Date.now()) / 1000) : 60;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    }
  );
}
