/**
 * POST /api/download/[slug]/complete — validate ad completion, return signed download token
 *
 * Body: { startedAt: number }  (unix timestamp in seconds when video started)
 * Server validates elapsed time >= required duration, then returns HMAC token.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAdDownloadLink,
  generateDownloadToken,
  trackAdEvent,
} from "@/lib/ad-download";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  const link = await getAdDownloadLink(slug);
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If ad is disabled, no completion needed — return token immediately
  if (!link.ad_enabled || !link.campaign) {
    const { token, expiresAt } = generateDownloadToken(link.id);
    return NextResponse.json({ token, expiresAt });
  }

  const body = await request.json();
  const { startedAt } = body;

  if (!startedAt || typeof startedAt !== "number") {
    return NextResponse.json(
      { error: "startedAt (unix timestamp) is required" },
      { status: 400 }
    );
  }

  const nowSecs = Math.floor(Date.now() / 1000);
  const elapsed = nowSecs - startedAt;
  const required = link.campaign.videoDurationSecs;

  // Allow 2-second tolerance for network latency
  if (elapsed < required - 2) {
    return NextResponse.json(
      {
        error: "Video not watched for required duration",
        required,
        elapsed,
        remaining: required - elapsed,
      },
      { status: 403 }
    );
  }

  // Track completion
  await trackAdEvent(link.id, "ad_complete", request);

  // Generate download token (valid for 5 minutes)
  const { token, expiresAt } = generateDownloadToken(link.id);

  return NextResponse.json({ token, expiresAt });
}
