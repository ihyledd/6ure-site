/**
 * POST /api/download/[slug]/view — track page view (public, rate-limited)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdDownloadLink, trackAdEvent } from "@/lib/ad-download";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const link = await getAdDownloadLink(slug);
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await trackAdEvent(link.id, "view", request);

  return NextResponse.json({ ok: true });
}
