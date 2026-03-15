import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function GET() {
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
