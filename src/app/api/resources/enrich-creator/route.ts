/**
 * POST /api/resources/enrich-creator
 *
 * Takes a creator social URL (TikTok/YouTube) and returns name + avatar.
 * Reuses the same enrichCreator() from the request form scraper.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enrichCreator, isAllowedCreatorDomain } from "@/lib/scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = String(body.url ?? "").trim();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!isAllowedCreatorDomain(url)) {
      return NextResponse.json(
        { error: "Only TikTok and YouTube URLs are supported" },
        { status: 400 }
      );
    }

    const result = await enrichCreator(url);

    return NextResponse.json({
      name: result.name,
      avatar: result.avatar,
      platform: result.platform,
    });
  } catch (err) {
    console.error("[enrich-creator] Error:", err);
    return NextResponse.json({ error: "Failed to fetch creator info" }, { status: 500 });
  }
}
