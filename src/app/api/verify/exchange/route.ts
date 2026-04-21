import { NextRequest, NextResponse } from "next/server";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

/**
 * Exchange Discord OAuth2 authorization code for the authorizing user's id (identify scope).
 * Used when users land on /verify?code=... after the verification bot's OAuth link.
 *
 * Set DISCORD_VERIFY_REDIRECT_URI in .env if it differs from https://6ureleaks.com/verify
 * (must match exactly what is registered for this OAuth app in Discord Developer Portal).
 */
const DISCORD_TOKEN = "https://discord.com/api/oauth2/token";

function siteOrigin(): string {
  const u = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";
  return u.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  // Rate limit: 3 per 5 minutes per IP
  const ip = getClientIp(req);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code =
    body && typeof body === "object" && "code" in body && typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code.trim()
      : "";
  if (!code || code.length > 512) {
    return NextResponse.json({ error: "Missing or invalid code" }, { status: 400 });
  }

  const clientId = process.env.DISCORD_VERIFY_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_VERIFY_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
  const redirectUri =
    process.env.DISCORD_VERIFY_REDIRECT_URI || `${siteOrigin()}/verify`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Server not configured (Discord OAuth credentials missing)" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(DISCORD_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "6ureVerify/1.0",
    },
    body: params.toString(),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg = tokenJson.error_description || tokenJson.error || "Token exchange failed";
    return NextResponse.json({ error: msg }, { status: tokenRes.status >= 400 ? tokenRes.status : 400 });
  }

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "User-Agent": "6ureVerify/1.0",
    },
  });

  const me = (await meRes.json()) as { id?: string; message?: string };
  if (!meRes.ok || !me.id) {
    return NextResponse.json(
      { error: me.message || "Failed to load Discord user" },
      { status: meRes.status }
    );
  }

  return NextResponse.json({ userId: me.id });
}
