/**
 * GET    /api/promotions/campaigns/[id] — single campaign
 * PATCH  /api/promotions/campaigns/[id] — update campaign
 * DELETE /api/promotions/campaigns/[id] — delete campaign
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

// Map body camelCase keys → actual snake_case column names
const FIELD_MAP: Record<string, string> = {
  name: "name",
  isActive: "is_active",
  sponsorEnabled: "sponsor_enabled",
  sponsorName: "sponsor_name",
  sponsorTagline: "sponsor_tagline",
  sponsorLogoUrl: "sponsor_logo_url",
  sponsorCtaText: "sponsor_cta_text",
  sponsorCtaUrl: "sponsor_cta_url",
  videoUrl: "video_url",
  videoDurationSecs: "video_duration_secs",
  headlineTemplate: "headline_template",
  subheadline: "subheadline",
};

export async function GET(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const campaign = await queryOne(
    `SELECT * FROM ad_campaigns WHERE id = ?`,
    [id]
  );

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [bodyKey, colName] of Object.entries(FIELD_MAP)) {
    if (bodyKey in body) {
      let val = body[bodyKey];
      if (typeof val === "boolean") val = val ? 1 : 0;
      sets.push(`${colName} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  sets.push("updated_at = NOW()");
  values.push(id);

  await execute(
    `UPDATE ad_campaigns SET ${sets.join(", ")} WHERE id = ?`,
    values
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  // Unlink download links (set campaign_id to NULL)
  await execute(
    `UPDATE ad_download_links SET campaign_id = NULL WHERE campaign_id = ?`,
    [id]
  );

  await execute(`DELETE FROM ad_campaigns WHERE id = ?`, [id]);

  return NextResponse.json({ ok: true });
}
