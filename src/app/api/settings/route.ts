import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMergedUserSettings, setUserSetting } from "@/lib/dal/request-settings";

const ALLOWED_KEYS = [
  "theme",
  "anonymous",
  "push",
  "discordDm",
  "discordDmCommentReplies",
  "timezone",
  "dateFormat",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const settings = await getMergedUserSettings(session.user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const toSet: Record<string, string> = {};
  for (const k of ALLOWED_KEYS) {
    if (body[k] !== undefined) {
      toSet[k] = String(body[k]);
    }
  }

  try {
    for (const [key, value] of Object.entries(toSet)) {
      await setUserSetting(session.user.id, key, value);
    }
    const settings = await getMergedUserSettings(session.user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] POST /api/settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
