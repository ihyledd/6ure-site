import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/** Returns the same JSON shape as the legacy Requests API /auth/me for compatibility. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      username: session.user.name ?? session.user.username ?? "User",
      discord_handle: session.user.username ?? session.user.name ?? null,
      avatar: session.user.image ?? null,
      guild_nickname: session.user.name ?? null,
      guild_avatar: session.user.image ?? null,
      isStaff: session.user.role === "ADMIN",
      patreon_premium: session.user.patreon_premium ?? false,
      boost_level: session.user.boost_level ?? 0,
      avatar_decoration: session.user.avatar_decoration ?? null,
    },
  });
}
