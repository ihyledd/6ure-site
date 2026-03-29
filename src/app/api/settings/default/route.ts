import { NextResponse } from "next/server";
import { getDefaultSettings } from "@/lib/dal/request-settings";

const DEFAULTS: Record<string, string> = {
  theme: "dark",
  anonymous: "false",
  push: "true",
  discordDm: "true",
  discordDmCommentReplies: "true",
  timezone: "auto",
  dateFormat: "relative",
};

export async function GET() {
  try {
    const rows = await getDefaultSettings();
    const settings: Record<string, string> = { ...DEFAULTS, ...rows };
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/settings/default:", error);
    return NextResponse.json(
      { error: "Failed to fetch default settings" },
      { status: 500 }
    );
  }
}
