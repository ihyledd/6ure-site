import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getMembershipSettings,
  updateMembershipSettings,
} from "@/lib/site-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const settings = await getMembershipSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/site-settings/membership:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, string>;
    await updateMembershipSettings(body);
    const settings = await getMembershipSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] PUT /api/site-settings/membership:", error);
    return NextResponse.json(
      { error: "Failed to save membership settings" },
      { status: 500 }
    );
  }
}
