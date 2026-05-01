/**
 * Assign a Discord role to a guild member (used when an application is accepted).
 * Requires DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.
 */
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID;

/** Role IDs for a guild member, or null if not in guild / not configured / API error. */
export async function fetchGuildMemberRoleIds(userId: string): Promise<string[] | null> {
  if (!BOT_TOKEN || !GUILD_ID) return null;
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "User-Agent": "6ure/1.0",
        },
      }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { roles?: string[] };
    return Array.isArray(data.roles) ? data.roles : [];
  } catch {
    return null;
  }
}

export async function assignDiscordRoleToUser(
  userId: string,
  roleId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || !GUILD_ID) {
    return { ok: false, error: "Server not configured (DISCORD_BOT_TOKEN or DISCORD_GUILD_ID)" };
  }
  console.log(`[DiscordRole] Using Guild: ${GUILD_ID}, Token starts with: ${BOT_TOKEN.slice(0, 10)}...`);

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

export async function removeDiscordRoleFromUser(
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
      method: "DELETE",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "User-Agent": "6ure/1.0",
      },
    }
  );

  if (res.ok) return { ok: true };
  const text = await res.text();
  return { ok: false, error: `Discord API ${res.status}: ${text.slice(0, 200)}` };
}
