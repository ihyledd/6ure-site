/**
 * GET /api/admin/subscriptions — List subscriptions with pagination and filtering.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSubscriptions } from "@/lib/dal/subscriptions";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;
  const planCategory = searchParams.get("planCategory") || undefined;
  const planInterval = searchParams.get("planInterval") || undefined;
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const data = await listSubscriptions({
      status,
      planCategory,
      planInterval,
      search,
      limit,
      offset,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] GET /api/admin/subscriptions:", error);
    return NextResponse.json({ error: "Failed to list subscriptions" }, { status: 500 });
  }
}
