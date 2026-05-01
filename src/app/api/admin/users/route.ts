import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listUsersForAdmin, setUserTags, getUserTags } from "@/lib/dal/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listUsersForAdmin();
    return NextResponse.json(users);
  } catch (err) {
    console.error("[API] GET /api/admin/users:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Body: { userId: string, tags?: string[], addTag?: string, removeTag?: string }
 * Updates a user's tags. Tags are simple strings (e.g. "protected").
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const userId = String(body.userId || "");
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  let nextTags: string[] = [];
  if (Array.isArray(body.tags)) {
    nextTags = body.tags.map(String);
  } else if (body.addTag || body.removeTag) {
    const current = await getUserTags(userId);
    const set = new Set(current.map(t => t.toLowerCase()));
    if (body.addTag) set.add(String(body.addTag).toLowerCase());
    if (body.removeTag) set.delete(String(body.removeTag).toLowerCase());
    nextTags = Array.from(set);
  } else {
    return NextResponse.json({ error: "Provide tags, addTag or removeTag" }, { status: 400 });
  }

  await setUserTags(userId, nextTags);
  return NextResponse.json({ success: true, tags: nextTags });
}
