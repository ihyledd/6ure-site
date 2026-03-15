import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasUpvoted } from "@/lib/requests-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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
    const hasUpvotedResult = await hasUpvoted(requestId, session.user.id);
    return NextResponse.json({ hasUpvoted: hasUpvotedResult });
  } catch (error) {
    console.error("[API] GET /api/upvotes/[requestId]/status:", error);
    return NextResponse.json(
      { error: "Failed to check upvote status" },
      { status: 500 }
    );
  }
}
