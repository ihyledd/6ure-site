import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execute, queryOne } from "@/lib/db";

/**
 * GET /api/admin/protection/resources/[id]
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = await queryOne(
    `SELECT id, name, editor_name, place_url, thumbnail_url, is_protected, hidden, status
       FROM resources_items WHERE id = ?`,
    [numId]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/**
 * PATCH /api/admin/protection/resources/[id]
 * Body: { is_protected?: boolean, hidden?: boolean }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: { is_protected?: boolean; hidden?: boolean } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sets: string[] = [];

  if (typeof body.is_protected === "boolean") {
    if (body.is_protected) {
      sets.push("is_protected = 1", "hidden = 1", "status = 'Hidden'");
    } else {
      sets.push(
        "is_protected = 0",
        "hidden = 0",
        "status = CASE WHEN status = 'Hidden' THEN 'Completed' ELSE status END"
      );
    }
  }

  if (typeof body.hidden === "boolean" && typeof body.is_protected !== "boolean") {
    if (body.hidden) {
      sets.push("hidden = 1", "status = 'Hidden'");
    } else {
      sets.push(
        "hidden = 0",
        "status = CASE WHEN status = 'Hidden' THEN 'Completed' ELSE status END"
      );
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Provide is_protected or hidden" }, { status: 400 });
  }

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM resources_items WHERE id = ?",
    [numId]
  );
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute(`UPDATE resources_items SET ${sets.join(", ")} WHERE id = ?`, [numId]);
  const fresh = await queryOne(
    `SELECT id, name, editor_name, place_url, thumbnail_url, is_protected, hidden, status
       FROM resources_items WHERE id = ?`,
    [numId]
  );
  return NextResponse.json({ success: true, item: fresh });
}
