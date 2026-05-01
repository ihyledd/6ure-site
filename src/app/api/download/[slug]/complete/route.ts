/**
 * POST /api/download/[slug]/complete — validate ad completion, return signed download token
 *
 * Body: { startedAt: number, watchedSeconds?: number, campaignId?: string }
 *   - startedAt: unix timestamp in seconds when video started
 *   - watchedSeconds: client-tracked active watch time (excludes pauses/tab-switches)
 *   - campaignId: the campaign the client was shown (important for random campaign mode)
 *
 * Server validates elapsed time >= required duration, then returns HMAC token.
 * Validation uses EITHER wall-clock elapsed OR client-reported watchedSeconds
 * to handle client/server clock skew and paused-timer edge cases.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAdDownloadLink,
  generateDownloadToken,
  trackAdEvent,
} from "@/lib/ad-download";
import { queryOne } from "@/lib/db";
import type { AdCampaignRow } from "@/lib/ad-download";

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
  const { startedAt, watchedSeconds, campaignId } = body;

  if (!startedAt || typeof startedAt !== "number") {
    return NextResponse.json(
      { error: "startedAt (unix timestamp) is required" },
      { status: 400 }
    );
  }

  // Determine which campaign to validate against.
  // If the client provides a campaignId (e.g. for random campaign mode),
  // look up that specific campaign to avoid duration mismatches.
  let required = link.campaign.video_duration_secs;
  if (campaignId && typeof campaignId === "string") {
    const specificCampaign = await queryOne<AdCampaignRow>(
      `SELECT * FROM ad_campaigns WHERE id = ? AND is_active = 1`,
      [campaignId]
    );
    if (specificCampaign) {
      required = specificCampaign.video_duration_secs;
    }
  }

  const nowSecs = Math.floor(Date.now() / 1000);
  const elapsed = nowSecs - startedAt;

  // Validate using EITHER wall-clock elapsed time OR client-reported watchedSeconds.
  // This handles: (1) clock skew between client and server,
  //               (2) random campaign mode picking a different campaign on reload.
  // Allow 2-second tolerance for network latency on each check.
  const clientWatched =
    typeof watchedSeconds === "number" && watchedSeconds > 0
      ? watchedSeconds
      : 0;

  const elapsedPasses = elapsed >= required - 2;
  const clientPasses = clientWatched >= required - 2;

  if (!elapsedPasses && !clientPasses) {
    return NextResponse.json(
      {
        error: "Video not watched for required duration",
        required,
        elapsed,
        clientWatched,
        remaining: Math.max(required - elapsed, required - clientWatched, 0),
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
