import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { queryOne, execute } from "@/lib/db";

/**
 * DELETE /api/resources/comments/[commentId]
 * Author or admin can delete (soft delete via is_deleted flag).
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const id = parseInt(commentId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const row = await queryOne<{ user_id: string }>("SELECT user_id FROM resource_comments WHERE id = ?", [id]);
  if (!row) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && row.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await execute("UPDATE resource_comments SET is_deleted = 1 WHERE id = ?", [id]);
  return NextResponse.json({ success: true });
}
