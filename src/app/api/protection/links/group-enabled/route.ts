import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setProtectionGroupEnabled } from "@/lib/dal/protection";

/** PATCH /api/protection/links/group-enabled - Toggle group enabled (staff only, JSON file only) */
export async function PATCH(req: Request) {
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
    const groupName = body.group_name && typeof body.group_name === "string" ? body.group_name.trim() : "";
    const enabled = body.enabled === true;

    if (!groupName) {
      return NextResponse.json(
        { error: "group_name is required" },
        { status: 400 }
      );
    }

    const ok = await setProtectionGroupEnabled(groupName, enabled);
    if (!ok) {
      return NextResponse.json(
        { error: "Group not found or per-group enable not supported (MySQL mode)" },
        { status: 404 }
      );
    }
    return NextResponse.json({ group_name: groupName, enabled });
  } catch (error) {
    console.error("[API] PATCH /api/protection/links/group-enabled:", error);
    return NextResponse.json(
      { error: "Failed to update group enabled state" },
      { status: 500 }
    );
  }
}
