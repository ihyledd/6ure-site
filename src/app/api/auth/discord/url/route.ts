import { NextRequest, NextResponse } from "next/server";
import { getDiscordOAuthUrl } from "@/lib/discord-oauth-state";
import { authLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

function isAllowedCallbackUrl(callbackUrl: string): boolean {
  if (callbackUrl.startsWith("/")) return true;
  try {
    const u = new URL(callbackUrl);
    const baseUrl = new URL(BASE);
    return u.origin === baseUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 5 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = authLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  if (!callbackUrl || typeof callbackUrl !== "string") {
    return NextResponse.json({ error: "callbackUrl required" }, { status: 400 });
  }
  if (!isAllowedCallbackUrl(callbackUrl)) {
    return NextResponse.json({ error: "Invalid callbackUrl" }, { status: 400 });
  }
  const url = getDiscordOAuthUrl(callbackUrl);
  if (!url) {
    return NextResponse.json(
      { error: "Discord OAuth not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ url });
}
