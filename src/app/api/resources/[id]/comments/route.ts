import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { query, queryOne, execute } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

/**
 * GET /api/resources/[id]/comments — list comments for a resource (newest first).
 */
export async function GET(_request: NextRequest, { params }: Props) {
  const { id } = await params;
  const resourceId = parseInt(id, 10);
  if (isNaN(resourceId)) return NextResponse.json({ error: "Invalid resource id" }, { status: 400 });

  const items = await query(
    `SELECT rc.id, rc.user_id, rc.user_name, rc.user_avatar, rc.body, rc.created_at,
            rc.is_pinned, rc.is_staff_reply,
            u.avatar AS db_avatar, u.display_name AS db_display_name, u.global_name AS db_global_name
     FROM resource_comments rc
     LEFT JOIN users u ON u.id = (rc.user_id COLLATE utf8mb4_unicode_ci)
     WHERE rc.resource_id = ? AND rc.is_deleted = 0
     ORDER BY rc.is_pinned DESC, rc.created_at DESC
     LIMIT 200`,
    [resourceId]
  );

  return NextResponse.json({ items });
}

/**
 * POST /api/resources/[id]/comments — add a comment.
 * Body: { body: string }
 */
export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const resourceId = parseInt(id, 10);
  if (isNaN(resourceId)) return NextResponse.json({ error: "Invalid resource id" }, { status: 400 });

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Block writing comments on hidden resources for non-admins.
  const resource = await queryOne<{ hidden: number | null; status: string | null }>(
    "SELECT hidden, status FROM resources_items WHERE id = ?",
    [resourceId]
  );
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  const isHidden = Number(resource.hidden) === 1 || resource.status === "Hidden";
  if (isHidden && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  let body: { body?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });

  const isStaff = session.user.role === "ADMIN";

  const result = await execute(
    `INSERT INTO resource_comments (resource_id, user_id, user_name, user_avatar, body, is_staff_reply)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [resourceId, session.user.id, session.user.name ?? null, session.user.image ?? null, text, isStaff ? 1 : 0]
  );

  return NextResponse.json({ success: true, id: (result as any).insertId });
}
