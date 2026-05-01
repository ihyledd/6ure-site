import { NextRequest, NextResponse } from "next/server";
import { findLeakByProductUrl } from "@/lib/leaks-loader";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";
import { queryOne } from "@/lib/db";

/**
 * GET /api/leaks/check?url=...
 * Check if a product URL is already leaked.
 *
 * Resolution order:
 *   1. resources_items DB (fast, indexed) — preferred
 *   2. YAML walker fallback for any pre-DB entries the bot still owns
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url query is required" },
      { status: 400 }
    );
  }

  // 1) DB-first lookup. Match exact place_url, ignoring trailing slashes.
  try {
    const dbRow = await queryOne<{
      id: number;
      name: string;
      editor_name: string;
      place_url: string | null;
      is_premium: number | null;
      thumbnail_url: string | null;
      hidden: number | null;
      status: string | null;
    }>(
      `SELECT id, name, editor_name, place_url, is_premium, thumbnail_url, hidden, status
       FROM resources_items
       WHERE TRIM(TRAILING '/' FROM place_url) = TRIM(TRAILING '/' FROM ?)
         AND (hidden = 0 OR hidden IS NULL)
         AND (status IS NULL OR status <> 'Hidden')
       LIMIT 1`,
      [url]
    );
    if (dbRow) {
      return NextResponse.json({
        leaked: true,
        leak: {
          name: dbRow.name,
          editor: dbRow.editor_name,
          place: dbRow.place_url,
          premium: Number(dbRow.is_premium) === 1,
          discordMessageUrl: null,
          thumbnail: dbRow.thumbnail_url,
        },
      });
    }
  } catch (err) {
    console.warn("[leaks/check] DB lookup failed, falling back to YAML walker:", err);
  }

  // 2) YAML fallback for legacy entries.
  const entry = await findLeakByProductUrl(url);
  if (!entry) {
    return NextResponse.json({ leaked: false });
  }

  return NextResponse.json({
    leaked: true,
    leak: {
      name: entry.name,
      editor: entry.editor,
      place: entry.place,
      premium: entry.premium,
      discordMessageUrl: entry.discordMessageUrl,
      thumbnail: entry.thumbnail || null,
    },
  });
}
