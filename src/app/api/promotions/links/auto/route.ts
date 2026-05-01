/**
 * POST /api/promotions/links/auto — auto-create an ad-gate download link
 * Called by the Discord bot when generating download links.
 *
 * Body: { resourceName, downloadUrl, editorName? }
 * Returns: { slug, gateUrl }
 *
 * If an ad_download_links row already exists for the same downloadUrl,
 * returns the existing slug instead of creating a duplicate.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { randomBytes } from "crypto";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://6ureleaks.com";
const BOT_SECRET = process.env.AD_GATE_BOT_SECRET ?? "";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

export async function POST(request: NextRequest) {
  // Authenticate via shared secret (bot → website)
  const auth = request.headers.get("x-bot-secret");
  if (!BOT_SECRET || auth !== BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { resourceName, downloadUrl, editorName } = body;
  // Note: password is intentionally ignored — password protection
  // should only live on the SFTPGo share, not the ad-gate page

  if (!resourceName || !downloadUrl) {
    return NextResponse.json(
      { error: "resourceName and downloadUrl are required" },
      { status: 400 }
    );
  }

  // Check if any campaigns are active — if none, return the direct URL
  // so the bot can give the user a direct download link with no ad-gate
  const activeCampaign = await queryOne<{ id: string }>(
    `SELECT id FROM ad_campaigns WHERE is_active = 1 LIMIT 1`
  );

  if (!activeCampaign) {
    return NextResponse.json({ directUrl: downloadUrl });
  }

  // Check if link already exists for this download URL
  const existing = await queryOne<{ slug: string }>(
    `SELECT slug FROM ad_download_links WHERE download_url = ? AND is_active = 1 LIMIT 1`,
    [downloadUrl]
  );

  if (existing) {
    return NextResponse.json({
      slug: existing.slug,
      gateUrl: `${SITE_URL}/download/${existing.slug}`,
      reused: true,
    });
  }

  // Create new link (password is never stored — it stays on SFTPGo share only)
  const id = randomBytes(12).toString("hex").slice(0, 25);
  const slug = generateSlug(resourceName);

  await execute(
    `INSERT INTO ad_download_links (id, slug, resource_name, download_url, editor_name, password, ad_enabled, is_active, campaign_mode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, 1, 1, 'random', NOW(), NOW())`,
    [id, slug, resourceName, downloadUrl, editorName ?? null]
  );

  return NextResponse.json(
    {
      slug,
      gateUrl: `${SITE_URL}/download/${slug}`,
      reused: false,
    },
    { status: 201 }
  );
}
