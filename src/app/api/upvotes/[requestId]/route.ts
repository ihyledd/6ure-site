import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getRequestById,
  hasUpvoted,
  addUpvote,
  removeUpvote,
} from "@/lib/requests-api";
import { upvote } from "@/lib/requests-bot-api";
import { ensureRequestsUserExists } from "@/lib/ensure-requests-user";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(_request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const requestId = parseInt((await params).requestId, 10);
  if (Number.isNaN(requestId)) {
    return NextResponse.json(
      { error: "Invalid request id" },
      { status: 400 }
    );
  }

  try {
    await ensureRequestsUserExists(session.user.id);

    const req = await getRequestById(requestId);
    if (!req) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const alreadyUpvoted = await hasUpvoted(requestId, session.user.id);

    if (alreadyUpvoted) {
      await removeUpvote(requestId, session.user.id);
      upvote(requestId);
      return NextResponse.json({
        upvoted: false,
        upvotes: req.upvotes - 1,
      });
    }

    await addUpvote(requestId, session.user.id);
    upvote(requestId);
    return NextResponse.json({
      upvoted: true,
      upvotes: req.upvotes + 1,
    });
  } catch (error) {
    console.error("[API] POST /api/upvotes/[requestId]:", error);
    return NextResponse.json(
      { error: "Failed to toggle upvote" },
      { status: 500 }
    );
  }
}
