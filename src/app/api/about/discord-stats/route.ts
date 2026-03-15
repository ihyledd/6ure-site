import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_MS = 60 * 1000; // 1 min
let cached: { members: number; online: number; at: number } | null = null;

/** Proxies Discord invite counts server-side to avoid CORS and verify what Discord returns. */
export async function GET() {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached);
  }

  try {
    const res = await fetch(
      "https://discord.com/api/v10/invites/6ure?with_counts=true",
      { next: { revalidate: 0 } }
    );
    const data = await res.json().catch(() => ({}));

    const members =
      typeof data.approximate_member_count === "number"
        ? data.approximate_member_count
        : typeof data.profile?.member_count === "number"
          ? data.profile.member_count
          : 0;

    const online =
      typeof data.approximate_presence_count === "number"
        ? data.approximate_presence_count
        : typeof data.profile?.online_count === "number"
          ? data.profile.online_count
          : 0;

    cached = { members, online, at: now };
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ members: 0, online: 0 });
  }
}
