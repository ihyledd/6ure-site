import { query, execute } from "@/lib/db";

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
  tags: string[];
};

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }
  return [];
}

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
    tags: unknown;
  }>(
    `SELECT id, username, global_name, display_name, guild_nickname, avatar, guild_avatar,
            patreon_premium, COALESCE(boost_level, 0) as boost_level,
            last_login_at, last_activity_at, tags
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
    tags: parseTags(r.tags),
  }));
}

/**
 * Set a user's tag list (overwrites). Tags are arbitrary strings; common values: "protected".
 */
export async function setUserTags(userId: string, tags: string[]): Promise<void> {
  const sanitized = Array.from(new Set(tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)));
  await execute("UPDATE users SET tags = ? WHERE id = ?", [JSON.stringify(sanitized), userId]);
}

export async function getUserTags(userId: string): Promise<string[]> {
  const rows = await query<{ tags: unknown }>("SELECT tags FROM users WHERE id = ?", [userId]);
  return parseTags(rows[0]?.tags);
}
