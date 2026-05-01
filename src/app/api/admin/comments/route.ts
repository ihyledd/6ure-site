import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, execute } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Global comments moderation — unifies request comments and resource comments.
 * Query params:
 *   page, limit
 *   type    (all | request | resource)
 *   search  (matches body or username)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const type = searchParams.get("type") || "all";
  const search = searchParams.get("search")?.trim() || "";
  const offset = (page - 1) * limit;

  // Ensure resource_comments table exists (defensive — migration also creates it).
  try {
    await execute(`CREATE TABLE IF NOT EXISTS resource_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resource_id INT NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_avatar VARCHAR(500),
      body TEXT NOT NULL,
      is_deleted TINYINT(1) DEFAULT 0,
      is_pinned TINYINT(1) DEFAULT 0,
      is_staff_reply TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_resource (resource_id),
      INDEX idx_user (user_id),
      INDEX idx_created (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (e) { /* ignore */ }

  const requestParams: any[] = [];
  const resourceParams: any[] = [];
  let requestWhere = "";
  let resourceWhere = "";

  if (search) {
    const p = `%${search}%`;
    requestWhere = "WHERE (c.content LIKE ? OR u.display_name LIKE ? OR u.username LIKE ?)";
    requestParams.push(p, p, p);
    resourceWhere = "WHERE (rc.body LIKE ? OR rc.user_name LIKE ?)";
    resourceParams.push(p, p);
  }

  const requestSql = `
    SELECT c.id, c.user_id, c.content as body, c.created_at,
           u.display_name as user_name, u.avatar as user_avatar,
           c.request_id as target_id,
           r.title as target_title,
           'request' as type
    FROM comments c
    LEFT JOIN users u ON u.id = (c.user_id COLLATE utf8mb4_unicode_ci)
    LEFT JOIN requests r ON r.id = c.request_id
    ${requestWhere}
  `;

  const resourceSql = `
    SELECT rc.id, rc.user_id, rc.body, rc.created_at,
           rc.user_name, rc.user_avatar,
           rc.resource_id as target_id,
           ri.name as target_title,
           'resource' as type
    FROM resource_comments rc
    LEFT JOIN resources_items ri ON ri.id = rc.resource_id
    ${resourceWhere}
  `;

  let unionSql: string;
  let unionParams: any[];
  if (type === "request") {
    unionSql = requestSql;
    unionParams = requestParams;
  } else if (type === "resource") {
    unionSql = resourceSql;
    unionParams = resourceParams;
  } else {
    unionSql = `(${requestSql}) UNION ALL (${resourceSql})`;
    unionParams = [...requestParams, ...resourceParams];
  }

  const countRes = await query<{ total: number }>(`SELECT COUNT(*) as total FROM (${unionSql}) AS c`, unionParams);
  const total = countRes[0]?.total || 0;

  const items = await query(`${unionSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...unionParams, limit, offset]);

  return NextResponse.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * DELETE — supports both request comments and resource comments via type query param.
 * Query: ?id=<id>&type=request|resource
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "request";

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    if (type === "resource") {
      await execute("DELETE FROM resource_comments WHERE id = ?", [id]);
    } else {
      await execute("DELETE FROM comments WHERE id = ?", [id]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
