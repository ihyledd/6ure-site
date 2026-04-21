/**
 * POST /api/download/[slug]/sponsor-click — track sponsor CTA clicks (public)
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

  await trackAdEvent(link.id, "sponsor_click", request);

  return NextResponse.json({ ok: true });
}
