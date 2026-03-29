import { NextRequest, NextResponse } from "next/server";
import { findLeakByProductUrl } from "@/lib/leaks-loader";

/**
 * GET /api/leaks/check?url=...
 * Check if a product URL is already leaked. Returns { leaked: boolean, leak?: {...} }
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url query is required" },
      { status: 400 }
    );
  }

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
