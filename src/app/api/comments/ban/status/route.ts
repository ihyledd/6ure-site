import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isUserBannedFromComments } from "@/lib/requests-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ banned: false });
  }
  try {
    const status = await isUserBannedFromComments(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("[API] GET /api/comments/ban/status:", error);
    return NextResponse.json({ banned: false });
  }
}
