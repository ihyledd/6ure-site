import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markAllNotificationsRead } from "@/lib/requests-api";

async function handleReadAll() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    await markAllNotificationsRead(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] /api/notifications/read-all:", error);
    return NextResponse.json(
      { error: "Failed to mark all as read" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return handleReadAll();
}

export async function PATCH() {
  return handleReadAll();
}
