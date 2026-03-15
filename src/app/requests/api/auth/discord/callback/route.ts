import { NextRequest, NextResponse } from "next/server";
import { decodeState } from "@/lib/discord-oauth-state";
import { MysqlAdapter } from "@/lib/auth-mysql-adapter";
import {
  syncRequestsUser,
  fetchGuildMemberForSync,
} from "@/lib/sync-requests-user";
import type { DiscordProfile } from "@/lib/sync-requests-user";

/** User shape we need for session (id only required for createSession). */
type UserWithId = { id: string };

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
const SESSION_MAX_AGE = 24 * 60 * 60;

/** Canonical base URL for redirects (avoids redirect loops when Nginx redirects subdomains to main). */
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
const BASE_URL = BASE.replace(/\/$/, "");

function randomSessionToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${BASE_URL}/?error=config`,
      302
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${BASE_URL}/?error=missing_params`,
      302
    );
  }

  const decoded = decodeState(state);
  if (!decoded) {
    return NextResponse.redirect(
      `${BASE_URL}/?error=invalid_state`,
      302
    );
  }
  const { callbackUrl } = decoded;

  // Exchange code for token
  const tokenRes = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[Discord OAuth] token exchange failed:", err);
    return NextResponse.redirect(
      `${BASE_URL}/?error=token_exchange`,
      302
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const accessToken = tokenData.access_token;

  // Fetch Discord user
  const userRes = await fetch(DISCORD_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Discord-API-Version": "10",
    },
  });
  if (!userRes.ok) {
    return NextResponse.redirect(
      `${BASE_URL}/?error=user_fetch`,
      302
    );
  }

  const discordUser = (await userRes.json()) as {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string | null;
    avatar?: string | null;
    avatar_decoration_data?: { asset?: string } | null;
  };

  const profile: DiscordProfile = {
    id: discordUser.id,
    username: discordUser.username,
    discriminator: discordUser.discriminator,
    global_name: discordUser.global_name ?? null,
    avatar: discordUser.avatar ?? null,
    avatar_decoration_data: discordUser.avatar_decoration_data ?? null,
  };

  try {
    const guildMember = await fetchGuildMemberForSync(discordUser.id);
    await syncRequestsUser(profile, guildMember);
  } catch (e) {
    console.warn("[Discord OAuth] syncRequestsUser failed:", e);
  }

  const adapter = MysqlAdapter();
  const getUserByAccount = adapter.getUserByAccount;
  const createUser = adapter.createUser;
  const linkAccount = adapter.linkAccount;
  const createSession = adapter.createSession;
  if (!getUserByAccount || !createUser || !linkAccount || !createSession) {
    console.error("[Discord OAuth] Adapter missing required methods");
    return NextResponse.redirect(`${BASE_URL}/?error=config`, 302);
  }

  let user: UserWithId | null = await getUserByAccount({
    provider: "discord",
    providerAccountId: discordUser.id,
  });

  const displayName =
    discordUser.global_name ||
    (discordUser.discriminator && discordUser.discriminator !== "0"
      ? `${discordUser.username}#${discordUser.discriminator}`
      : discordUser.username);
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : null;

  if (!user) {
    // Adapter accepts this shape; next-auth types require extra fields we don't have from Discord
    const newUser = await createUser({
      name: displayName,
      email: undefined,
      emailVerified: null,
      image: avatarUrl,
    } as never);
    user = { id: newUser.id };
    await linkAccount({
      userId: user.id,
      type: "oauth",
      provider: "discord",
      providerAccountId: discordUser.id,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token ?? undefined,
      expires_at: tokenData.expires_in
        ? Math.floor(Date.now() / 1000) + tokenData.expires_in
        : undefined,
    });
  }

  const sessionToken = randomSessionToken();
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await createSession({
    sessionToken,
    userId: user.id,
    expires,
  });

  const redirectTarget =
    callbackUrl.startsWith("http")
      ? callbackUrl
      : callbackUrl.startsWith("/")
        ? `${BASE_URL}${callbackUrl}`
        : `${BASE_URL}/`;

  const res = NextResponse.redirect(redirectTarget, 302);

  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.NEXTAUTH_URL?.includes("6ureleaks.com");
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    path: "/",
    domain: isProduction ? ".6ureleaks.com" : undefined,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
  });

  return res;
}
