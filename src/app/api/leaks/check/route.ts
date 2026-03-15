import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/leaks/check?url=...
 * Check if a product URL is already leaked. Returns { leaked: boolean, leak?: {...} }
 * Full implementation can read from LEAKS_DATA_PATH (e.g. file or DB); stub returns false.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url query is required" },
      { status: 400 }
    );
  }
  // TODO: integrate leaks loader (file or DB) when LEAKS_DATA_PATH is set
  return NextResponse.json({ leaked: false });
}
