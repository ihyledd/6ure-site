/**
 * GET /api/admin/subscriptions/[id] — Get single subscription with payments and user details.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionById, getPaymentsByUser } from "@/lib/dal/subscriptions";
import { queryOne } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const sub = await getSubscriptionById(id);
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const payments = await getPaymentsByUser(sub.user_id);

    const user = await queryOne<{ username: string; avatar: string | null; discord_handle: string | null }>(
      "SELECT username, avatar, discord_handle FROM users WHERE id = ?",
      [sub.user_id]
    );

    return NextResponse.json({ ...sub, payments, user });
  } catch (error) {
    console.error("[API] GET /api/admin/subscriptions/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
