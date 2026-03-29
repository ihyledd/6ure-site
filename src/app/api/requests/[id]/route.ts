import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getRequestById,
  getRequestByIdForBot,
  getRequesterUsername,
  getUpvotedRequestIdsForUser,
  getUpvoterUserIds,
  updateRequest,
  recordView,
  deleteRequest,
  createNotification,
} from "@/lib/requests-api";
import {
  embedUpdate,
  sendDeletionDm,
  requestDeleted,
  cancelLog,
  notifyFulfillment,
  getBaseUrl,
} from "@/lib/requests-bot-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
    }

    const req = await getRequestById(id);
    if (!req) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const session = await auth();
    if (session?.user?.id) {
      const sessionId =
        request.cookies.get("__Secure-next-auth.session-token")?.value ??
        request.cookies.get("next-auth.session-token")?.value ??
        "anonymous";
      const viewResult = await recordView(id, session.user.id, sessionId);
      if (viewResult.incremented && viewResult.views !== undefined) {
        (req as { views: number }).views = viewResult.views;
        embedUpdate(id);
      }
      const upvotedIds = await getUpvotedRequestIdsForUser(session.user.id, [id]);
      (req as { hasUpvoted?: boolean }).hasUpvoted = upvotedIds.has(id);
    }

    return NextResponse.json(req);
  } catch (error) {
    console.error("[API] GET /api/requests/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 }
    );
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Parameters<typeof updateRequest>[1] = {};
    if (body.status != null) updates.status = body.status;
    if (body.comments_locked != null)
      updates.commentsLocked = Boolean(body.comments_locked);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates" }, { status: 400 });
    }
    await updateRequest(id, updates);

    // When a request is marked as completed (fulfilled), notify creator + upvoters
    if (updates.status === "completed") {
      const baseUrl = getBaseUrl();
      const reqData = await getRequestByIdForBot(id);
      const requestTitle = reqData?.title ?? "Untitled";
      const requestUrl = `${baseUrl}/requests/${id}`;
      const leakMessageUrl = reqData?.leak_message_url;

      // In-app notification for the request creator
      if (reqData?.user_id) {
        await createNotification(
          id,
          reqData.user_id,
          "request_fulfilled",
          "Request Fulfilled! 🎉",
          `Your request "${requestTitle}" has been fulfilled and is now available.`
        );
      }

      // Get all upvoter user IDs for DM notifications
      const upvoterIds = await getUpvoterUserIds(id);

      // Tell the bot to DM the creator + all upvoters
      notifyFulfillment({
        requestId: id,
        requestTitle,
        requestUrl,
        leakMessageUrl: leakMessageUrl || null,
        creatorUserId: reqData?.user_id ?? "",
        upvoterUserIds: upvoterIds,
      });

      // Also refresh the Discord embed
      embedUpdate(id);
    }

    const req = await getRequestById(id);
    return NextResponse.json(req ?? { id, ...updates });
  } catch (error) {
    console.error("[API] PATCH /api/requests/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 }
    );
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let body: { reason?: string; sendDm?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body
  }

  try {
    const reqForBot = await getRequestByIdForBot(id);
    const requester = reqForBot?.user_id;
    const requestTitle = reqForBot?.title ?? "Untitled";
    const messageId = reqForBot?.message_id ?? null;
    const publicMessageId = reqForBot?.public_message_id ?? null;
    const requesterUsername = await getRequesterUsername(id);

    // Create in-app notification for the requester before deleting
    if (requester) {
      const reasonText = body.reason ? ` Reason: ${body.reason}` : "";
      await createNotification(
        null, // request_id null since it will be deleted
        requester,
        "request_deleted",
        "Request Deleted",
        `Your request "${requestTitle}" has been deleted by staff.${reasonText}`
      );
    }

    if (requester && body.sendDm) {
      sendDeletionDm(requester, requestTitle, body.reason, id);
    }
    requestDeleted(id, messageId, publicMessageId);
    if (reqForBot) {
      cancelLog({
        type: "deleted",
        requestId: id,
        staffId: session.user.id,
        staffUsername: session.user.name ?? null,
        title: reqForBot.title,
        product_url: reqForBot.product_url,
        userId: reqForBot.user_id,
        requesterUsername,
        reason: body.reason || undefined,
        message_id: messageId,
        public_message_id: publicMessageId,
      });
    }

    await deleteRequest(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/requests/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
