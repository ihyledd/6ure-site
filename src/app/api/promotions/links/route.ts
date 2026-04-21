/**
 * GET  /api/promotions/links — list all download links (admin)
 * POST /api/promotions/links — create download link (admin)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/ad-download";

export async function GET() {
  await requireAdmin();

  const links = await query(
    `SELECT l.*, c.name as campaign_name
     FROM ad_download_links l
     LEFT JOIN ad_campaigns c ON l.campaign_id = c.id
     ORDER BY l.created_at DESC`
  );

  return NextResponse.json(links);
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json();
  const {
    resourceName,
    slug: customSlug,
    downloadUrl,
    adEnabled = true,
    campaignId,
    campaignMode = "specific",
    thumbnailUrl,
    editorName,
    description,
    password,
    sftpgoPath,
    expiresAt,
  } = body;

  if (!resourceName || !downloadUrl) {
    return NextResponse.json(
      { error: "resourceName and downloadUrl are required" },
      { status: 400 }
    );
  }

  const slug = customSlug || slugify(resourceName);

  // Check slug uniqueness
  const existing = await queryOne(
    `SELECT id FROM ad_download_links WHERE slug = ?`,
    [slug]
  );
  if (existing) {
    return NextResponse.json(
      { error: "A download link with this slug already exists" },
      { status: 409 }
    );
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);

  await execute(
    `INSERT INTO ad_download_links (id, slug, resource_name, download_url, ad_enabled, campaign_id, campaign_mode, thumbnail_url, editor_name, description, password, sftpgo_path, is_active, expires_at, total_views, total_completes, total_downloads, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 0, 0, NOW(), NOW())`,
    [
      id,
      slug,
      resourceName,
      downloadUrl,
      adEnabled ? 1 : 0,
      campaignId ?? null,
      campaignMode,
      thumbnailUrl ?? null,
      editorName ?? null,
      description ?? null,
      password ?? null,
      sftpgoPath ?? null,
      expiresAt ?? null,
    ]
  );

  return NextResponse.json(
    { id, slug, url: `https://6ureleaks.com/download/${slug}` },
    { status: 201 }
  );
}
