import { NextRequest, NextResponse } from "next/server";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const SNOWFLAKE_RE = /^\d{17,20}$/;

export async function GET(req: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(req);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }
  if (!SNOWFLAKE_RE.test(id)) {
    return NextResponse.json({ error: "Invalid Discord user ID" }, { status: 400 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: "Server not configured (DISCORD_BOT_TOKEN not set)" },
      { status: 503 }
    );
  }

  const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "User-Agent": "6ureOAuth/1.0",
    },
  });

  const data = (await res.json()) as { id?: string; message?: string; username?: string; code?: number };

  if (!res.ok) {
    const msg = data.message || "Failed to fetch Discord user";
    return NextResponse.json({ error: msg, code: data.code }, { status: res.status });
  }

  return NextResponse.json(data);
}
