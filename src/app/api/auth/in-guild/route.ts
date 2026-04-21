import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function GET(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ inGuild: false });
  }

  if (!BOT_TOKEN || !GUILD_ID) {
    return NextResponse.json({ inGuild: false });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${session.user.id}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    return NextResponse.json({ inGuild: res.ok });
  } catch {
    return NextResponse.json({ inGuild: false });
  }
}
