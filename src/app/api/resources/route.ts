/**
 * GET /api/resources — list resources with search, sort, pagination, editor filter
 *
 * Query params:
 *   page     (default 1)
 *   limit    (default 24, max 100)
 *   sort     (popular | recent | name | downloads)
 *   order    (asc | desc)
 *   search   (fulltext search on name + editor)
 *   editor   (filter by exact editor name)
 *   premium  (0 | 1)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Auto-migration for views (kept for legacy deployments)
  try {
    const { execute } = await import("@/lib/db");
    await execute("ALTER TABLE resources_items ADD COLUMN view_count INT DEFAULT 0").catch(() => {});
    await execute(`
      CREATE TABLE IF NOT EXISTS resource_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_view (resource_id, session_id)
      )
    `).catch(() => {});
  } catch (e) {}

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
  const sort = searchParams.get("sort") ?? "recent";
  const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";
  const search = searchParams.get("search")?.trim() ?? "";
  const editor = searchParams.get("editor")?.trim() ?? "";
  const premium = searchParams.get("premium");
  const category = searchParams.get("category")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const includeHidden = searchParams.get("includeHidden") === "1";
  const skipMetadata = searchParams.get("skipMetadata") === "1";

  // Admins can request hidden resources by passing includeHidden=1.
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const showHidden = isAdmin && includeHidden;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push(`MATCH(r.name, r.editor_name) AGAINST(? IN BOOLEAN MODE)`);
    // Add * for prefix matching
    params.push(search.split(/\s+/).map(w => `+${w}*`).join(" "));
  }

  if (editor) {
    conditions.push(`r.editor_name = ?`);
    params.push(editor);
  }

  if (premium === "1") {
    conditions.push(`r.is_premium = 1`);
  } else if (premium === "0") {
    conditions.push(`r.is_premium = 0`);
  }

  if (category) {
    conditions.push(`r.category = ?`);
    params.push(category);
  }

  // Visibility: hide rows flagged as hidden or with status='Hidden' for non-admins.
  if (!showHidden) {
    conditions.push(`(r.hidden = 0 OR r.hidden IS NULL)`);
    conditions.push(`(r.status IS NULL OR r.status <> 'Hidden')`);
  }

  // Optional explicit status filter (admin uses this for the dropdown).
  if (status && status !== "all") {
    conditions.push(`r.status = ?`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sort mapping
  const sortMap: Record<string, string> = {
    popular: "r.download_count",
    recent: "r.leaked_at",
    name: "r.name",
    downloads: "r.download_count",
    views: "r.view_count",
  };
  const sortColumn = sortMap[sort] ?? "r.leaked_at";

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM resources_items r ${whereClause}`;
  const countResult = await query<{ total: number }>(countSql, params);
  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Fetch items
  const itemsSql = `
    SELECT r.id, r.editor_name, r.name, r.file_path, r.thumbnail_url, r.place_url, r.category,
           r.download_count, r.view_count, r.is_premium, r.leaked_at, r.discord_member_id, r.discord_member_name,
           r.status, r.hidden, r.is_protected, r.price, r.price_numeric, r.file_size_bytes,
           e.social_url AS editor_social_url, e.avatar_url AS editor_avatar_url,
           u.avatar AS discord_member_avatar
    FROM resources_items r
    LEFT JOIN resources_editors e ON e.id = r.editor_id
    LEFT JOIN users u ON u.id = (r.discord_member_id COLLATE utf8mb4_unicode_ci)
    ${whereClause}
    ORDER BY ${sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;

  try {
    const items = await query(itemsSql, [...params, limit, offset]);

    // Get stats & metadata only if not skipped
    let stats: any = [];
    let editors: any = [];
    let categories: any = [];

    if (!skipMetadata) {
      stats = await query<{ total: number; editors: number; total_downloads: number }>(`
        SELECT
          (SELECT COUNT(*) FROM resources_items) as total,
          (SELECT COUNT(*) FROM resources_editors) as editors,
          (SELECT COALESCE(SUM(download_count), 0) FROM resources_items) as total_downloads,
          (SELECT COALESCE(SUM(view_count), 0) FROM resources_items) as total_views
      `);

      if (!editor) {
        editors = await query<{ name: string; resource_count: number }>(
          `SELECT name, resource_count FROM resources_editors ORDER BY resource_count DESC LIMIT 50`
        );
      }

      categories = await query<{ category: string; count: number }>(
        `SELECT category, COUNT(*) as count FROM resources_items WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`
      );
    }

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages },
      ...(skipMetadata ? {} : {
        stats: stats[0] ?? { total: 0, editors: 0, total_downloads: 0 },
        topEditors: editors,
        categories,
      })
    });
  } catch (err: any) {
    console.error("[API Resources] Error:", err);
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}

