import { NextRequest, NextResponse } from "next/server";

const DISCORD_AUTHORIZE = "https://discord.com/oauth2/authorize";
const STATE_COOKIE = "discord_oauth_state";
const CALLBACK_COOKIE = "discord_oauth_callback";
const STATE_MAX_AGE = 600; // 10 min

function randomState(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const cookieOpts = {
  path: "/" as const,
  maxAge: STATE_MAX_AGE,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Discord OAuth not configured (DISCORD_CLIENT_ID / DISCORD_REDIRECT_URI)" },
      { status: 503 }
    );
  }

  const callbackUrl =
    request.nextUrl.searchParams.get("callbackUrl") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://6ureleaks.com";
  const state = randomState();

  const scope = "identify guilds";
  const url = new URL(DISCORD_AUTHORIZE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString(), 302);
  res.cookies.set(STATE_COOKIE, state, cookieOpts);
  res.cookies.set(CALLBACK_COOKIE, callbackUrl, cookieOpts);
  return res;
}
