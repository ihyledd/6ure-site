import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getRequestById,
  getComments,
  createComment,
  getCommentById,
  getLatestCommentByUser,
  isUserBannedFromComments,
} from "@/lib/requests-api";
import { ensureRequestsUserExists } from "@/lib/ensure-requests-user";
import { getMergedUserSettings } from "@/lib/dal/request-settings";
import { comment as botComment, commentReply } from "@/lib/requests-bot-api";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const requestId = parseInt((await params).requestId, 10);
  if (Number.isNaN(requestId)) {
    return NextResponse.json(
      { error: "Invalid request id" },
      { status: 400 }
    );
  }
  try {
    const comments = await getComments(requestId);
    return NextResponse.json(comments);
  } catch (error) {
    console.error("[API] GET /api/comments/request/[requestId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

const COMMENT_COOLDOWN_MS = 10 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
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

  const requestId = parseInt((await params).requestId, 10);
  if (Number.isNaN(requestId)) {
    return NextResponse.json(
      { error: "Invalid request id" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const content = body.content ?? "";
  const parentId =
    body.parent_id != null ? parseInt(String(body.parent_id), 10) : null;

  if (parentId != null) {
    const parentComment = await getCommentById(parentId);
    if (!parentComment) {
      return NextResponse.json(
        { error: "Parent comment not found" },
        { status: 404 }
      );
    }
    if (parentComment.request_id !== requestId) {
      return NextResponse.json(
        { error: "Parent comment does not belong to this request" },
        { status: 400 }
      );
    }
  }


  if (!content || String(content).trim().length === 0) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }
  if (String(content).length > 2000) {
    return NextResponse.json(
      { error: "Comment must be 2000 characters or less" },
      { status: 400 }
    );
  }

  const existingRequest = await getRequestById(requestId);
  if (!existingRequest) {
    return NextResponse.json(
      { error: "Request not found" },
      { status: 404 }
    );
  }

  let banStatus: Awaited<ReturnType<typeof isUserBannedFromComments>> = { banned: false };
  try {
    banStatus = await isUserBannedFromComments(session.user.id);
  } catch {
    // comment_bans table may not exist yet
  }
  if (banStatus.banned) {
    return NextResponse.json(
      {
        error: "You are not allowed to comment.",
        reason: banStatus.reason ?? null,
        expires_at: banStatus.expires_at ?? null,
      },
      { status: 403 }
    );
  }

  if (session.user.role !== "ADMIN") {
    const latest = await getLatestCommentByUser(session.user.id);
    if (latest && Date.now() - latest.createdAt.getTime() < COMMENT_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (COMMENT_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${Math.ceil(waitSec / 60)} minute(s) before posting another comment.`,
          cooldown_seconds: waitSec,
        },
        { status: 429 }
      );
    }
  }

  try {
    await ensureRequestsUserExists(session.user.id);
    const commentId = await createComment(
      requestId,
      session.user.id,
      String(content).trim(),
      Number.isNaN(parentId as number) ? null : (parentId as number)
    );

    botComment(requestId, commentId);

    const parentComment = parentId != null ? await getCommentById(parentId) : null;
    if (parentComment && parentComment.userId !== session.user.id) {
      const parentAuthorSettings = await getMergedUserSettings(parentComment.userId);
      const sendReplyDm = parentAuthorSettings.discordDmCommentReplies === "true";
      const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
      const requestUrl = `${baseUrl}/requests/request/${requestId}`;
      commentReply({
        requestId,
        commentId,
        parentAuthorId: parentComment.userId,
        sendDm: sendReplyDm,
        requestTitle: existingRequest.title ?? "Untitled Request",
        requestUrl,
        replyContent: String(content).trim(),
        replierUsername: session.user.name ?? null,
        replierId: session.user.id,
      });
    }

    const comments = await getComments(requestId);
    const comment = comments.find((c) => c.id === commentId);
    const cooldown_seconds = session.user.role === "ADMIN" ? 0 : 10 * 60; // 10 min for non-staff
    if (!comment) {
      return NextResponse.json({ id: commentId, message: "Created", cooldown_seconds });
    }
    return NextResponse.json({ ...comment, cooldown_seconds });
  } catch (error) {
    console.error("[API] POST /api/comments/request/[requestId]:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
