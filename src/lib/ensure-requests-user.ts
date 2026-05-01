/**
 * Ensures a Discord user exists in the requests users table.
 * Required before addUpvote, createComment, etc. due to FK constraints.
 */
import { queryOne } from "@/lib/db";
import { fetchDiscordUser, syncRequestsUser, fetchGuildMemberForSync } from "@/lib/sync-requests-user";

export async function ensureRequestsUserExists(userId: string): Promise<void> {
  const existing = await queryOne<{ id: string; avatar_decoration: string | null }>(
    "SELECT id, avatar_decoration FROM users WHERE id = ?",
    [userId]
  );
  if (existing) {
    if (existing.avatar_decoration == null) {
      setImmediate(() => {
        fetchDiscordUser(userId)
          .then(async (discord) => {
            if (discord) {
              const guildMember = await fetchGuildMemberForSync(userId);
              return syncRequestsUser(discord, guildMember);
            }
          })
          .catch((e) => console.warn("[ensureRequestsUser] Background avatar_decoration sync failed:", (e as Error).message));
      });
    }
    return;
  }

  const discord = await fetchDiscordUser(userId);
  if (discord) {
    await syncRequestsUser(discord, await fetchGuildMemberForSync(userId));
    return;
  }

  const { execute } = await import("@/lib/db");
  await execute(
    `INSERT INTO users (id, username, discriminator, global_name, display_name, avatar, banner, accent_color, public_flags, premium_type, roles, patreon_premium, guild_nickname, guild_avatar, boost_level, premium_since, avatar_decoration, created_at, updated_at, last_login_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE last_activity_at = NOW(), updated_at = NOW()`,
    [userId, "User", null, null, null, null, null, null, 0, 0, null, false, null, null, 0, null, null]
  );
}
