/**
 * GET/PUT /api/site-settings/subscription-roles — Admin-only management of Discord role IDs per plan.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionRoleSettings, setSubscriptionRoleSettings } from "@/lib/site-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const settings = await getSubscriptionRoleSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/site-settings/subscription-roles:", error);
    return NextResponse.json({ error: "Failed to fetch role settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { premiumRoleId, lpRoleId } = body as {
      premiumRoleId?: string;
      lpRoleId?: string;
    };

    await setSubscriptionRoleSettings({ premiumRoleId, lpRoleId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] PUT /api/site-settings/subscription-roles:", error);
    return NextResponse.json({ error: "Failed to save role settings" }, { status: 500 });
  }
}
