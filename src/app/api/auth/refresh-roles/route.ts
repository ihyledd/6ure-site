import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchDiscordUser, fetchGuildMemberForSync, syncRequestsUser } from "@/lib/sync-requests-user";
import { authLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

/**
 * POST /api/auth/refresh-roles
 * Refresh the logged-in user's Discord roles in the `users` table.
 *
 * Returns hasPremiumRole and hasLeakProtectionRole (Leak Protection / protected) so the client
 * can show success only when at least one paid tier role is present on Discord.
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = authLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  const discordId = session?.user?.id;
  if (!discordId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const [profile, member] = await Promise.all([
      fetchDiscordUser(discordId),
      fetchGuildMemberForSync(discordId),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Discord profile unavailable" }, { status: 503 });
    }

    const synced = await syncRequestsUser(profile, member);
    return NextResponse.json({
      ok: true,
      hasPremiumRole: synced.hasPremiumRole,
      hasLeakProtectionRole: synced.hasLeakProtectionRole,
    });
  } catch (e) {
    const message = e instanceof Error && e.message ? e.message : "Failed to refresh roles";
    console.warn("[API] POST /api/auth/refresh-roles:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

