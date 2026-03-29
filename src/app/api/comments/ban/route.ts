import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addCommentBan } from "@/lib/requests-api";
import { queryOne } from "@/lib/db";


export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  const userId = body.user_id;
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const userExists = await queryOne("SELECT 1 FROM users WHERE id = ?", [userId]);
  if (!userExists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reason = body.reason ?? null;
  const durationDays = body.duration_days != null ? parseInt(String(body.duration_days), 10) : null;
  try {
    await addCommentBan(userId, reason, session.user.id, durationDays);
    return NextResponse.json({
      success: true,
      message: durationDays
        ? `User banned from commenting for ${durationDays} days`
        : "User permanently banned from commenting",
    });
  } catch (error) {
    console.error("[API] POST /api/comments/ban:", error);
    return NextResponse.json(
      { error: "Failed to add ban" },
      { status: 500 }
    );
  }
}
