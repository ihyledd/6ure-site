import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNotifications } from "@/lib/requests-api";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const list = await getNotifications(session.user.id);
    return NextResponse.json(list);
  } catch (error) {
    console.error("[API] GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
