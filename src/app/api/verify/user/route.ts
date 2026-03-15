import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
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

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
