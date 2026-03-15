import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteCommentById, getCommentById } from "@/lib/requests-api";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const commentId = parseInt((await params).commentId, 10);
  if (Number.isNaN(commentId)) {
    return NextResponse.json(
      { error: "Invalid comment id" },
      { status: 400 }
    );
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    return NextResponse.json(
      { error: "Comment not found" },
      { status: 404 }
    );
  }

  const isStaff = session.user.role === "ADMIN";
  const isOwner = comment.userId === session.user.id;
  if (!isStaff && !isOwner) {
    return NextResponse.json(
      { error: "You can only delete your own comments" },
      { status: 403 }
    );
  }

  try {
    await deleteCommentById(commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/comments/[commentId]:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
