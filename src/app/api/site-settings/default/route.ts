import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDefaultSettings,
  updateDefaultSettings,
} from "@/lib/dal/request-settings";

const DEFAULTS: Record<string, string> = {
  theme: "dark",
  anonymous: "false",
  push: "true",
  discordDm: "true",
  discordDmCommentReplies: "true",
  timezone: "auto",
  dateFormat: "relative",
};

/** Staff only: GET default user settings. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const rows = await getDefaultSettings();
    const settings = { ...DEFAULTS, ...rows };
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/site-settings/default:", error);
    return NextResponse.json(
      { error: "Failed to fetch default settings" },
      { status: 500 }
    );
  }
}

/** Staff only: PUT default user settings. */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, string>;
    await updateDefaultSettings(body);
    const rows = await getDefaultSettings();
    const settings = { ...DEFAULTS, ...rows };
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] PUT /api/site-settings/default:", error);
    return NextResponse.json(
      { error: "Failed to save default settings" },
      { status: 500 }
    );
  }
}
