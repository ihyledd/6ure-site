/**
 * POST /api/resources/upload
 *
 * Creates a new resource entry. Requires LEAKER or ADMIN role.
 *
 * Body (JSON):
 *   name          string   (required)
 *   editor_name   string   (required)
 *   category      string   (required)
 *   file_path     string   (required) - path on cloud, e.g. "EDITOR/PACK NAME"
 *   thumbnail_url string   (required)
 *   is_premium    boolean  (default false)
 *   place_url     string   (optional) - original source link
 *   tags          string   (optional) - comma-separated
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { query, execute } from "@/lib/db";

// Placeholder leaker role ID — replace with real Discord role ID
const LEAKER_ROLE_ID = process.env.DISCORD_LEAKER_ROLE_ID || "0000000000000000000";

const VALID_CATEGORIES = [
  "Adobe After Effects",
  "Adobe Premiere Pro",
  "Adobe Photoshop",
  "Alight Motion",
  "CapCut",
  "Sony Vegas Pro",
  "Davinci Resolve",
  "Video Star",
  "Topaz Labs",
  "Other",
];

/** Check if user has the LEAKER role from their stored roles JSON */
function hasLeakerRole(rolesJson: string | null): boolean {
  if (!rolesJson) return false;
  try {
    const roles: string[] = JSON.parse(rolesJson);
    return Array.isArray(roles) && roles.includes(LEAKER_ROLE_ID);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // 1. Auth check
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Role check: must be ADMIN or LEAKER
  const isAdmin = session.user.role === "ADMIN";

  let isLeaker = false;
  if (!isAdmin) {
    const userRow = await query<{ roles: string | null }>(
      "SELECT roles FROM users WHERE id = ?",
      [userId]
    );
    isLeaker = userRow[0] ? hasLeakerRole(userRow[0].roles) : false;
  }

  if (!isAdmin && !isLeaker) {
    return NextResponse.json(
      { error: "You do not have permission to upload resources. Leaker role required." },
      { status: 403 }
    );
  }

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const editorName = String(body.editor_name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const filePath = String(body.file_path ?? "").trim();
  const thumbnailUrl = String(body.thumbnail_url ?? "").trim();
  const isPremium = body.is_premium === true || body.is_premium === "true" ? 1 : 0;
  const placeUrl = body.place_url ? String(body.place_url).trim() : null;
  const editorSocialUrl = body.editor_social_url ? String(body.editor_social_url).trim() : null;
  const tags = body.tags ? String(body.tags).trim() : null;

  // 4. Validation
  if (!name) return NextResponse.json({ error: "Resource name is required" }, { status: 400 });
  if (!editorName) return NextResponse.json({ error: "Editor name is required" }, { status: 400 });
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }
  if (!filePath) return NextResponse.json({ error: "File path is required" }, { status: 400 });
  if (!thumbnailUrl) return NextResponse.json({ error: "Thumbnail URL is required" }, { status: 400 });

  // 4b. Editor protection check — neither leakers nor admins may upload resources
  // for editors with an active protection entry (matched by creator_name OR display_name).
  try {
    const protectedRow = await query<{ id: number }>(
      `SELECT id FROM protected_users
       WHERE (LOWER(creator_name) = LOWER(?) OR LOWER(display_name) = LOWER(?))
         AND (subscription_ends_at IS NULL OR subscription_ends_at > NOW())
       LIMIT 1`,
      [editorName, editorName]
    );
    if (protectedRow.length > 0) {
      return NextResponse.json(
        { error: `This editor (${editorName}) is on the protection list. Uploads for protected editors are not allowed.` },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[resources/upload] Protection check failed:", err);
    // Fail-closed for safety: do not allow upload if check errored.
    return NextResponse.json({ error: "Could not verify editor protection status" }, { status: 503 });
  }

  // 4c. Protected-links check — block if the creator-social or product URL matches
  // any URL/keyword in the protection_groups (file-based or DB).
  try {
    const { checkRequestProtectionFromFile } = await import("@/lib/protection-links-file");
    const protectionResult = await checkRequestProtectionFromFile(
      editorSocialUrl ?? "",
      placeUrl ?? ""
    );
    if (protectionResult.protected) {
      const matchedUrl = protectionResult.url || placeUrl || editorSocialUrl;
      const groupLabel = protectionResult.group ? ` (group "${protectionResult.group}")` : "";
      const reasonLabel =
        protectionResult.reason === "keyword_match"
          ? "matches a protected keyword"
          : "is on the protection list";
      return NextResponse.json(
        {
          error: `This URL ${reasonLabel}${groupLabel}. Uploads for protected URLs are not allowed.`,
          matched_url: matchedUrl ?? null,
          group: protectionResult.group ?? null,
        },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[resources/upload] Protected-link check failed:", err);
    return NextResponse.json({ error: "Could not verify URL protection status" }, { status: 503 });
  }

  try {
    // 5. Upsert editor (also save social URL and avatar if provided)
    let avatarUrl = null;
    if (editorSocialUrl && (editorSocialUrl.includes("tiktok.com") || editorSocialUrl.includes("youtube.com") || editorSocialUrl.includes("youtu.be"))) {
      try {
        const { enrichCreator } = await import("@/lib/scraper");
        const enriched = await enrichCreator(editorSocialUrl);
        avatarUrl = enriched.avatar;
      } catch (err) {
        console.error("[POST enrich] Error:", err);
      }
    }

    await execute(
      `INSERT INTO resources_editors (name, social_url, avatar_url, resource_count, total_downloads)
       VALUES (?, ?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         social_url = COALESCE(VALUES(social_url), social_url),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url)`,
      [editorName, editorSocialUrl, avatarUrl]
    );




    const editorRow = await query<{ id: number }>(
      "SELECT id FROM resources_editors WHERE name = ?",
      [editorName]
    );
    const editorId = editorRow[0]?.id;
    if (!editorId) {
      return NextResponse.json({ error: "Failed to create editor record" }, { status: 500 });
    }

    // 6. Insert resource
    const result = await execute(
      `INSERT INTO resources_items
         (editor_id, editor_name, name, file_path, thumbnail_url, place_url, category, tags,
          download_count, is_premium, leaked_at, discord_member_id, discord_member_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), ?, ?)`,
      [
        editorId,
        editorName,
        name,
        filePath,
        thumbnailUrl,
        placeUrl,
        category,
        tags,
        isPremium,
        userId, // uploader's Discord ID
        session.user.name ?? null, // uploader's display name
      ]
    );

    // 7. Update editor stats
    await execute(
      `UPDATE resources_editors
       SET resource_count = (SELECT COUNT(*) FROM resources_items WHERE editor_id = ?),
           total_downloads = (SELECT COALESCE(SUM(download_count), 0) FROM resources_items WHERE editor_id = ?)
       WHERE id = ?`,
      [editorId, editorId, editorId]
    );

    return NextResponse.json({
      success: true,
      id: (result as any).insertId,
      message: "Resource uploaded successfully",
    });
  } catch (err) {
    console.error("[resources/upload] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
