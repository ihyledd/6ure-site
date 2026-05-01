/**
 * GET /api/resources/[id] — single resource detail with related items from same editor
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  // Auto-migration for views
  try {
    await execute("ALTER TABLE resources_items ADD COLUMN view_count INT DEFAULT 0").catch(() => {});
  } catch (e) {}

  const item = await queryOne<Record<string, unknown>>(
    `SELECT r.*, e.social_url AS editor_social_url, e.avatar_url AS editor_avatar_url,
            e.total_downloads AS editor_total_downloads,
            r.view_count,
            e.resource_count AS editor_resource_count,
            u.avatar AS discord_member_avatar
     FROM resources_items r
     LEFT JOIN resources_editors e ON e.id = r.editor_id
     LEFT JOIN users u ON u.id = (r.discord_member_id COLLATE utf8mb4_unicode_ci)
     WHERE r.id = ?`,
    [id]
  );


  if (!item) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Get related resources from the same editor (exclude current)
  const related = await query(
    `SELECT r.id, r.name, r.thumbnail_url, r.download_count, r.view_count, r.leaked_at, r.editor_name,
            e.social_url AS editor_social_url, e.avatar_url AS editor_avatar_url,
            r.is_premium, r.category
     FROM resources_items r
     LEFT JOIN resources_editors e ON e.id = r.editor_id
     WHERE r.editor_id = ? AND r.id != ?
     ORDER BY r.download_count DESC
     LIMIT 6`,
    [item.editor_id, id]
  );



  return NextResponse.json({ item, related });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // 1. Check ownership or admin status
    const item = await queryOne<{ discord_member_id: string; editor_id: number }>(
      "SELECT discord_member_id, editor_id FROM resources_items WHERE id = ?",
      [id]
    );

    if (!item) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && item.discord_member_id !== userId) {
      return NextResponse.json({ error: "Unauthorized: You don't own this resource" }, { status: 403 });
    }

    // 2. Validate and Update
    const name = String(body.name || "").trim();
    const editorName = String(body.editor_name || "").trim();
    const description = String(body.description || "").trim();
    const thumbnailUrl = String(body.thumbnail_url || "").trim();
    const category = String(body.category || "").trim();
    const socialUrl = String(body.editor_social_url || "").trim();
    const placeUrl = body.place_url != null ? String(body.place_url).trim() : null;
    const price = body.price != null ? String(body.price).trim() : null;
    const priceNumeric = body.price_numeric != null && !isNaN(Number(body.price_numeric)) ? Number(body.price_numeric) : null;
    const fileSizeBytes = body.file_size_bytes != null && !isNaN(Number(body.file_size_bytes)) ? Number(body.file_size_bytes) : null;

    if (!name || !editorName) {
      return NextResponse.json({ error: "Name and Editor Name are required" }, { status: 400 });
    }

    // Protected-link enforcement: if the leaker is changing place_url or social URL
    // to a value that matches the protection list, reject.
    if (placeUrl || socialUrl) {
      try {
        const { checkRequestProtectionFromFile } = await import("@/lib/protection-links-file");
        const result = await checkRequestProtectionFromFile(socialUrl || "", placeUrl || "");
        if (result.protected) {
          const matchedUrl = result.url || placeUrl || socialUrl;
          const groupLabel = result.group ? ` (group "${result.group}")` : "";
          const reasonLabel =
            result.reason === "keyword_match" ? "matches a protected keyword" : "is on the protection list";
          return NextResponse.json(
            {
              error: `This URL ${reasonLabel}${groupLabel}. The change cannot be saved.`,
              matched_url: matchedUrl ?? null,
              group: result.group ?? null,
            },
            { status: 403 }
          );
        }
      } catch (err) {
        console.error("[PUT resource] Protection check failed:", err);
        return NextResponse.json({ error: "Could not verify URL protection status" }, { status: 503 });
      }
    }

    // Update resource (leaker can adjust their own metadata).
    // Empty thumbnail keeps the existing one (NULLIF -> COALESCE).
    await execute(
      `UPDATE resources_items 
       SET name = ?,
           editor_name = ?,
           description = ?,
           thumbnail_url = COALESCE(NULLIF(?, ''), thumbnail_url),
           category = ?,
           place_url = COALESCE(?, place_url),
           price = COALESCE(?, price),
           price_numeric = COALESCE(?, price_numeric),
           file_size_bytes = COALESCE(?, file_size_bytes)
       WHERE id = ?`,
      [name, editorName, description, thumbnailUrl, category, placeUrl, price, priceNumeric, fileSizeBytes, id]
    );

    // Update editor social URL and enrich avatar
    if (item.editor_id) {
      let avatarUrl = null;
      const editorSocialUrl = socialUrl;
      if (editorSocialUrl && (editorSocialUrl.includes("tiktok.com") || editorSocialUrl.includes("youtube.com") || editorSocialUrl.includes("youtu.be"))) {
        try {
          const { enrichCreator } = await import("@/lib/scraper");
          const enriched = await enrichCreator(editorSocialUrl);
          avatarUrl = enriched.avatar;
        } catch (err) {
          console.error("[PATCH enrich] Error:", err);
        }
      }

      await execute(
        `UPDATE resources_editors 
         SET social_url = ?,
             avatar_url = COALESCE(?, avatar_url)
         WHERE id = ?`,
        [editorSocialUrl, avatarUrl, item.editor_id]
      );
    }


    return NextResponse.json({ success: true, message: "Resource updated successfully" });

  } catch (err) {
    console.error("[resources/[id]/PUT] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
