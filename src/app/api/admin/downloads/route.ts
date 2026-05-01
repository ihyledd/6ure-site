import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, execute } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const search = searchParams.get("search")?.trim() || "";
  const searchType = searchParams.get("searchType") || "all";
  const offset = (page - 1) * limit;

  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS resource_downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        ip_address VARCHAR(45),
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Fix collation if table already exists with default collation
    await execute(`ALTER TABLE resource_downloads CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).catch(() => {});

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      const p = `%${search}%`;
      if (searchType === "user") {
        conditions.push(`(d.user_name LIKE ? OR d.user_id LIKE ? OR u.username LIKE ? OR u.global_name LIKE ? OR u.guild_nickname LIKE ?)`);
        params.push(p, p, p, p, p);
      } else if (searchType === "ip") {
        conditions.push(`d.ip_address LIKE ?`);
        params.push(p);
      } else if (searchType === "resource") {
        conditions.push(`(r.name LIKE ? OR r.editor_name LIKE ?)`);
        params.push(p, p);
      } else {
        // all
        conditions.push(`(d.ip_address LIKE ? OR d.user_name LIKE ? OR d.user_id LIKE ? OR r.name LIKE ? OR r.editor_name LIKE ? OR u.username LIKE ? OR u.global_name LIKE ? OR u.guild_nickname LIKE ?)`);
        params.push(p, p, p, p, p, p, p, p);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query<{ total: number }>(`
      SELECT COUNT(*) as total 
      FROM resource_downloads d 
      LEFT JOIN resources_items r ON r.id = d.resource_id
      LEFT JOIN users u ON u.id = (d.user_id COLLATE utf8mb4_unicode_ci)
      ${whereClause}
    `, params);
    const total = countRes[0]?.total || 0;

    const items = await query(`
      SELECT d.*,
             r.name as resource_name, r.editor_name as resource_editor,
             u.avatar as user_avatar, u.username as user_global_name,
             u.global_name as user_display_name, u.guild_nickname as user_nick,
             u.patreon_premium, u.leak_protection
      FROM resource_downloads d
      LEFT JOIN resources_items r ON r.id = d.resource_id
      LEFT JOIN users u ON u.id = (d.user_id COLLATE utf8mb4_unicode_ci)
      ${whereClause}
      ORDER BY d.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);


    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack, items: [] });
  }
}

