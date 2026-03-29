import { query } from "@/lib/db";

export type AdminUserRow = {
  id: string;
  username: string | null;
  globalName: string | null;
  displayName: string | null;
  guildNickname: string | null;
  avatar: string | null;
  guildAvatar: string | null;
  patreonPremium: boolean;
  boostLevel: number;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
};

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const rows = await query<{
    id: string;
    username: string | null;
    global_name: string | null;
    display_name: string | null;
    guild_nickname: string | null;
    avatar: string | null;
    guild_avatar: string | null;
    patreon_premium: 0 | 1 | boolean;
    boost_level: number | null;
    last_login_at: Date | string | null;
    last_activity_at: Date | string | null;
  }>(
    `SELECT id, username, global_name, display_name, guild_nickname, avatar, guild_avatar,
            patreon_premium, COALESCE(boost_level, 0) as boost_level,
            last_login_at, last_activity_at
     FROM users
     ORDER BY COALESCE(last_activity_at, last_login_at, created_at) DESC`,
    []
  );

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    globalName: r.global_name,
    displayName: r.display_name,
    guildNickname: r.guild_nickname,
    avatar: r.avatar,
    guildAvatar: r.guild_avatar,
    patreonPremium: Boolean(r.patreon_premium),
    boostLevel: Number(r.boost_level ?? 0),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    lastActivityAt: r.last_activity_at ? new Date(r.last_activity_at).toISOString() : null,
  }));
}

