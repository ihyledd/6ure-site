import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ──────────────────────────────────────────────────────────────────────────────
 *  In-memory sliding-window rate limiter (edge-compatible, no external deps).
 *  Applied at the middleware layer so EVERY /api/* request is covered.
 * ────────────────────────────────────────────────────────────────────────────── */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // default cap per IP
const SENSITIVE_LIMIT = 10; // auth / payment routes
const CLEANUP_INTERVAL = 5 * 60_000;

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

function checkRate(key: string, limit: number): { ok: boolean; remaining: number; reset: number } {
  cleanup();
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    return { ok: false, remaining: 0, reset: bucket.timestamps[0] + WINDOW_MS };
  }

  bucket.timestamps.push(now);
  return { ok: true, remaining: limit - bucket.timestamps.length, reset: now + WINDOW_MS };
}

/* ──────────────────────────────────────────────────────────────────────────────
 *  Detect sensitive routes that get a lower rate limit.
 * ────────────────────────────────────────────────────────────────────────────── */
const SENSITIVE_PREFIXES = [
  "/api/auth/",
  "/api/paypal/",
  "/api/contact",
  "/api/apply",
  "/api/verify/",
  "/api/password/",
];

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Security headers applied to every response.
 * These protect against XSS, clickjacking, MIME sniffing, and other common attacks.
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent the page from being embedded in iframes (clickjacking protection)
  "X-Frame-Options": "DENY",
  // Block MIME-type sniffing (prevents browser from guessing content types)
  "X-Content-Type-Options": "nosniff",
  // Controls referrer information sent with requests
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Restrict browser features (camera, microphone, geolocation, etc.)
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  // Enforce HTTPS for 1 year (includeSubDomains for all subdomains)
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  // Prevent your site from being used as a cross-origin opener
  "Cross-Origin-Opener-Policy": "same-origin",
  // Content Security Policy – allow inline scripts/styles (needed for Next.js)
  // but block everything else to same-origin or trusted domains
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://discord.com https://api.hlx.li https://www.paypal.com https://www.sandbox.paypal.com",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://discord.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "),
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ── Rate-limit all /api/* routes ──────────────────────────────────────── */
  if (pathname.startsWith("/api/")) {
    // Skip rate limiting for endpoints that fire on every page load or are bot-authed
    const RATE_LIMIT_SKIP = ["/api/paypal/webhook", "/api/auth/session", "/api/auth/me", "/api/promotions/links/auto", "/api/db-fix", "/api/db-alter"];
    if (RATE_LIMIT_SKIP.includes(pathname)) {
      // fall through — no rate limit
    } else {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

      const limit = isSensitiveRoute(pathname) ? SENSITIVE_LIMIT : MAX_REQUESTS_PER_WINDOW;
      const key = `${ip}:${pathname}`;
      const result = checkRate(key, limit);

      if (!result.ok) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.max(1, retryAfter)),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(result.reset),
            },
          }
        );
      }
    }
  }

  /* ── Forward pathname for server components ──────────────────────────── */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  /* ── Apply all security headers ──────────────────────────────────────── */
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Reduce stale page serving after deploy (Server Action mismatch)
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
