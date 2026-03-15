import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { markNotificationRead } from "@/lib/requests-api";

async function handleRead(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid notification id" },
      { status: 400 }
    );
  }

  try {
    await markNotificationRead(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] /api/notifications/[id]/read:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return handleRead(request, ctx.params);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return handleRead(request, ctx.params);
}
