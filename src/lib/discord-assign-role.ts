/**
 * Assign a Discord role to a guild member (used when an application is accepted).
 * Requires DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.
 */
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function assignDiscordRoleToUser(
  userId: string,
  roleId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || !GUILD_ID) {
    return { ok: false, error: "Server not configured (DISCORD_BOT_TOKEN or DISCORD_GUILD_ID)" };
  }
  if (!roleId || !userId) {
    return { ok: false, error: "Missing roleId or userId" };
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Length": "0",
        "User-Agent": "6ure/1.0",
      },
    }
  );

  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, error: `Discord API ${res.status}: ${text.slice(0, 200)}` };
}
