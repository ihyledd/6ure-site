import { NextResponse } from "next/server";
import { getRequestStats } from "@/lib/requests-api";

export const dynamic = "force-dynamic";

// In-memory cache for stats (same for all users) - reduces DB load
const STATS_CACHE_TTL_MS = 30 * 1000; // 30 seconds
let statsCache: { data: unknown; expires: number } = { data: null, expires: 0 };

export async function GET() {
  try {
    const now = Date.now();
    if (statsCache.data !== null && now < statsCache.expires) {
      return NextResponse.json(statsCache.data, {
        headers: { "Cache-Control": "public, max-age=30" },
      });
    }
    const stats = await getRequestStats();
    statsCache = { data: stats, expires: now + STATS_CACHE_TTL_MS };
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error("[API] GET /api/requests/stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
