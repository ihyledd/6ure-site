import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchDiscordUser, fetchGuildMemberForSync, syncRequestsUser } from "@/lib/sync-requests-user";

/**
 * POST /api/auth/refresh-roles
 * Refresh the logged-in user's Discord roles in the `users` table.
 *
 * This keeps staff/premium/leak flags up to date without requiring sign-out/sign-in.
 */
export async function POST() {
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

    await syncRequestsUser(profile, member);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error && e.message ? e.message : "Failed to refresh roles";
    console.warn("[API] POST /api/auth/refresh-roles:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

