/**
 * PATCH /api/admin/promo-codes/[id] — Update/deactivate a promo code.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updatePromoCode } from "@/lib/dal/subscriptions";

export async function PATCH(
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
    const body = await request.json();
    await updatePromoCode(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API] PATCH /api/admin/promo-codes/${id}:`, error);
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
  }
}
