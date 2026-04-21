import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMergedUserSettings, setUserSetting } from "@/lib/dal/request-settings";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const ALLOWED_KEYS = [
  "theme",
  "anonymous",
  "push",
  "discordDm",
  "discordDmCommentReplies",
  "timezone",
  "dateFormat",
];

export async function GET(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

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
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(request);
  const { success: ok, reset: resetTs } = apiLimiter.check(ip);
  if (!ok) return tooManyRequestsResponse(resetTs);

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
