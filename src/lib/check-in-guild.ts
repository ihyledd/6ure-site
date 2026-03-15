const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

/** Check if a Discord user ID is a member of the configured guild. */
export async function checkUserInGuild(userId: string): Promise<boolean> {
  if (!BOT_TOKEN || !GUILD_ID || !userId) return false;
  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}
