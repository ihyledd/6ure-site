/**
 * GET    /api/promotions/links/[id] — single link
 * PATCH  /api/promotions/links/[id] — update link
 * DELETE /api/promotions/links/[id] — delete link
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const link = await queryOne(
    `SELECT l.*, c.name as campaignName
     FROM ad_download_links l
     LEFT JOIN ad_campaigns c ON l.campaignId = c.id
     WHERE l.id = ?`,
    [id]
  );

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json(link);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "slug", "resourceName", "downloadUrl", "adEnabled", "campaignId",
    "campaignMode", "thumbnailUrl", "editorName", "description", "password",
    "sftpgoPath", "isActive", "expiresAt",
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
    `UPDATE ad_download_links SET ${sets.join(", ")} WHERE id = ?`,
    values
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  // Delete analytics events first (cascade might not work with raw SQL)
  await execute(`DELETE FROM ad_analytics_events WHERE link_id = ?`, [id]);
  await execute(`DELETE FROM ad_download_links WHERE id = ?`, [id]);

  return NextResponse.json({ ok: true });
}
