import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  if (!BOT_TOKEN || !GUILD_ID) {
    return NextResponse.json(
      { error: "Server not configured (DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set)" },
      { status: 503 }
    );
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "User-Agent": "6ureOAuth/1.0",
      },
    }
  );

  if (res.status === 404) {
    return NextResponse.json({ joined_at: null });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
