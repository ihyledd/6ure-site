import { NextRequest, NextResponse } from "next/server";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID =
  process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID || process.env.GUILD_ID || "";

const SNOWFLAKE_RE = /^\d{17,20}$/;

export async function GET(req: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(req);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const userId = req.nextUrl.searchParams.get("user_id")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  if (!SNOWFLAKE_RE.test(userId)) {
    return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
  }
  if (!BOT_TOKEN || !GUILD_ID) {
    return NextResponse.json(
      { error: "Server not configured (DISCORD_BOT_TOKEN or guild ID not set)" },
      { status: 503 }
    );
  }

  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "User-Agent": "6ureOAuth/1.0",
    },
  });

  if (res.status === 404) {
    return NextResponse.json({ joined_at: null });
  }

  const data = await res.json();
  if (!res.ok) {
    const err = data as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to fetch guild member" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
