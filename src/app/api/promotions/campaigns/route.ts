/**
 * GET /api/promotions/campaigns  — list all campaigns (admin)
 * POST /api/promotions/campaigns — create campaign (admin)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  await requireAdmin();

  const campaigns = await query(
    `SELECT * FROM ad_campaigns ORDER BY createdAt DESC`
  );

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json();
  const {
    name,
    isActive = true,
    sponsorEnabled = true,
    sponsorName,
    sponsorTagline,
    sponsorLogoUrl,
    sponsorCtaText,
    sponsorCtaUrl,
    videoUrl,
    videoDurationSecs = 30,
    headlineTemplate,
    subheadline,
  } = body;

  if (!name || !videoUrl) {
    return NextResponse.json(
      { error: "name and videoUrl are required" },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

  await execute(
    `INSERT INTO ad_campaigns (id, name, isActive, sponsorEnabled, sponsorName, sponsorTagline, sponsorLogoUrl, sponsorCtaText, sponsorCtaUrl, videoUrl, videoDurationSecs, headlineTemplate, subheadline, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      id,
      name,
      isActive ? 1 : 0,
      sponsorEnabled ? 1 : 0,
      sponsorName ?? null,
      sponsorTagline ?? null,
      sponsorLogoUrl ?? null,
      sponsorCtaText ?? null,
      sponsorCtaUrl ?? null,
      videoUrl,
      videoDurationSecs,
      headlineTemplate ?? null,
      subheadline ?? null,
    ]
  );

  return NextResponse.json({ id }, { status: 201 });
}
