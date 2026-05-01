import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execute } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    await execute(`DELETE FROM resources_items WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const {
      name,
      editor_name,
      description,
      status,
      category,
      is_premium,
      is_featured,
      counts_for_payout,
      discord_member_id,
      discord_member_name,
      editor_social_url,
      place_url,
      file_path,
      hidden,
      is_protected,
      price,
      price_numeric,
      file_size_bytes,
    } = body;

    let { thumbnail_url } = body;

    // Read current thumbnail so we can decide whether to re-scrape and to keep the
    // existing value when the form sends an empty string.
    const { queryOne: q1 } = await import("@/lib/db");
    const current = await q1<{ thumbnail_url: string | null }>(
      "SELECT thumbnail_url FROM resources_items WHERE id = ?",
      [id]
    );
    const currentThumb = current?.thumbnail_url ?? null;

    // Only re-scrape when the user actually supplied a NEW external URL.
    // If the form sent the same URL we already have stored, skip the round-trip.
    const submittedThumb = typeof thumbnail_url === "string" ? thumbnail_url.trim() : "";
    const isNewExternal =
      submittedThumb &&
      /^https?:\/\//i.test(submittedThumb) &&
      submittedThumb !== currentThumb;
    if (isNewExternal) {
      try {
        const { downloadResourceThumbnail } = await import("@/lib/scraper");
        const localPath = await downloadResourceThumbnail(submittedThumb);
        if (localPath) thumbnail_url = localPath;
      } catch (err) {
        console.error("[Admin Resource PUT] Thumbnail scrape failed:", err);
      }
    } else {
      // Pass through the submitted value unchanged; SQL COALESCE/NULLIF will keep the existing one if blank.
      thumbnail_url = submittedThumb;
    }

    // 1. Update resource item — thumbnail uses NULLIF/COALESCE so empty string keeps the current value.
    await execute(
      `UPDATE resources_items 
       SET name = ?,
           editor_name = ?,
           description = ?,
           thumbnail_url = COALESCE(NULLIF(?, ''), thumbnail_url),
           status = ?,
           category = ?,
           is_premium = ?,
           is_featured = ?,
           counts_for_payout = ?,
           discord_member_id = ?,
           discord_member_name = ?,
           place_url = ?,
           file_path = ?,
           hidden = COALESCE(?, hidden),
           is_protected = COALESCE(?, is_protected),
           price = COALESCE(?, price),
           price_numeric = COALESCE(?, price_numeric),
           file_size_bytes = COALESCE(?, file_size_bytes)
       WHERE id = ?`,
      [
        name,
        editor_name,
        description,
        thumbnail_url,
        status,
        category,
        is_premium ? 1 : 0,
        is_featured ? 1 : 0,
        counts_for_payout !== false ? 1 : 0,
        discord_member_id,
        discord_member_name,
        place_url,
        file_path,
        hidden === undefined ? null : (hidden ? 1 : 0),
        is_protected === undefined ? null : (is_protected ? 1 : 0),
        price === undefined ? null : price,
        price_numeric === undefined ? null : price_numeric,
        file_size_bytes === undefined ? null : file_size_bytes,
        id
      ]
    );

    // 2. Update editor social URL and enrich avatar if provided
    if (editor_name) {
      let avatarUrl = null;
      if (editor_social_url && (editor_social_url.includes("tiktok.com") || editor_social_url.includes("youtube.com") || editor_social_url.includes("youtu.be"))) {
        try {
          const { enrichCreator } = await import("@/lib/scraper");
          const enriched = await enrichCreator(editor_social_url);
          avatarUrl = enriched.avatar;
        } catch (err) {
          console.error("[Admin PUT enrich] Error:", err);
        }
      }

      await execute(
        `UPDATE resources_editors 
         SET social_url = ?,
             avatar_url = COALESCE(?, avatar_url)
         WHERE name = ?`,
        [editor_social_url, avatarUrl, editor_name]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

/**
 * PATCH — single-field updates (hide/protect toggles).
 * Body: any subset of { hidden, is_protected, status, counts_for_payout, is_featured }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(idParam, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed = ["hidden", "is_protected", "is_featured", "counts_for_payout", "status"];
  const sets: string[] = [];
  const values: any[] = [];

  for (const k of allowed) {
    if (k in body) {
      const v = body[k];
      if (k === "status") {
        sets.push(`${k} = ?`);
        values.push(String(v));
      } else {
        sets.push(`${k} = ?`);
        values.push(v ? 1 : 0);
      }
    }
  }

  if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  try {
    await execute(`UPDATE resources_items SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Admin PATCH resource]", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
