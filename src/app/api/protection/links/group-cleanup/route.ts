import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cleanupRequestsForProtectionGroup } from "@/lib/requests-api";

/** POST /api/protection/links/group-cleanup - Delete existing requests that match a protection group (staff only) */
export async function POST(req: Request) {
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

  try {
    const body = await req.json();
    const groupName =
      body.group_name && typeof body.group_name === "string"
        ? body.group_name.trim()
        : "";

    if (!groupName) {
      return NextResponse.json(
        { error: "group_name is required" },
        { status: 400 }
      );
    }

    const { deletedCount } = await cleanupRequestsForProtectionGroup(groupName);
    return NextResponse.json({ group_name: groupName, deleted_count: deletedCount });
  } catch (error) {
    console.error("[API] POST /api/protection/links/group-cleanup:", error);
    return NextResponse.json(
      { error: "Failed to clean up requests for group" },
      { status: 500 }
    );
  }
}

