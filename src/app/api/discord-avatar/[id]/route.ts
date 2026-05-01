/**
 * GET /api/discord-avatar/[id]
 * 
 * Proxies Discord user avatars. Redirects to the real CDN URL.
 * Caches the lookup for 1 hour so Discord API isn't hit on every page load,
 * but avatars still update within an hour of the user changing them.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

// In-memory cache: userId -> { url, timestamp }
const avatarCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Validate ID format
  if (!/^\d{15,22}$/.test(id)) {
    return NextResponse.redirect(DEFAULT_AVATAR);
  }

  // Check cache
  const cached = avatarCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.redirect(cached.url, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.redirect(DEFAULT_AVATAR);
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${botToken}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Fallback: Discord default avatar based on user ID
      const idx = parseInt(id.slice(-2), 10) % 6;
      const fallback = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
      avatarCache.set(id, { url: fallback, ts: Date.now() });
      return NextResponse.redirect(fallback, {
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }

    const data = await res.json();
    let avatarUrl: string;

    if (data.avatar) {
      const ext = data.avatar.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${data.avatar}.${ext}?size=64`;
    } else {
      // Default Discord avatar
      const idx = parseInt(id.slice(-2), 10) % 6;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    }

    avatarCache.set(id, { url: avatarUrl, ts: Date.now() });

    return NextResponse.redirect(avatarUrl, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.redirect(DEFAULT_AVATAR);
  }
}
