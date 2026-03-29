/**
 * Proxy for Boosty images via api.hlx.li/scrape.
 * images.boosty.to URLs may block direct embedding; fetching via hlx.li works.
 */

import { NextRequest, NextResponse } from "next/server";

const SCRAPE_API_URL = (process.env.SCRAPE_API_URL || "https://api.hlx.li/scrape").trim();
const SCRAPE_API_KEY = (process.env.SCRAPE_API_KEY || "").trim();

function isBoostyImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("images.boosty.to");
  } catch {
    return false;
  }
}

/** Unwrap nested proxy URLs until we get the actual Boosty URL. */
function resolveBoostyUrl(url: string): string | null {
  let current = url.trim();
  const proxyPath = "/api/requests/image-proxy";
  while (current.includes(proxyPath)) {
    try {
      const parsed = current.startsWith("http") ? new URL(current) : new URL(current, "https://example.com");
      const inner = parsed.searchParams.get("url");
      if (!inner?.trim()) return null;
      current = decodeURIComponent(inner.trim());
    } catch {
      return null;
    }
  }
  return isBoostyImageUrl(current) ? current : null;
}

/** Add or override mh param for Boosty image size (e.g. 630px height). */
function normalizeBoostyImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("mh", "630");
    return u.toString();
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  const resolved = resolveBoostyUrl(url);
  if (!resolved) {
    return NextResponse.json({ error: "Only Boosty images are proxied" }, { status: 400 });
  }
  if (!SCRAPE_API_KEY) {
    return NextResponse.json({ error: "Image proxy not configured" }, { status: 503 });
  }

  const targetUrl = normalizeBoostyImageUrl(resolved);
  const scrapeUrl = `${SCRAPE_API_URL}?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(scrapeUrl, {
      headers: {
        "X-API-Key": SCRAPE_API_KEY,
        Accept: "image/*, */*",
        "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)",
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.warn("[ImageProxy] Failed:", url, (err as Error).message);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
