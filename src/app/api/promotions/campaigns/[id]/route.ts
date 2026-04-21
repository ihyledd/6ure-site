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

  const allowedFields = [
    "name", "isActive", "sponsorEnabled", "sponsorName", "sponsorTagline",
    "sponsorLogoUrl", "sponsorCtaText", "sponsorCtaUrl", "videoUrl",
    "videoDurationSecs", "headlineTemplate", "subheadline",
  ];

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      let val = body[field];
      if (typeof val === "boolean") val = val ? 1 : 0;
      sets.push(`${field} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  sets.push("updatedAt = NOW()");
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

  // Unlink download links (set campaignId to NULL)
  await execute(
    `UPDATE ad_download_links SET campaignId = NULL WHERE campaignId = ?`,
    [id]
  );

  await execute(`DELETE FROM ad_campaigns WHERE id = ?`, [id]);

  return NextResponse.json({ ok: true });
}
