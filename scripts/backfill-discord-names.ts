/**
 * Backfill discord_member_name from Discord API for all resources_items
 * that have a discord_member_id but no discord_member_name.
 *
 * Usage: npx tsx scripts/backfill-discord-names.ts
 */

import mysql from "mysql2/promise";

const DB_CONFIG: mysql.PoolOptions = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: 'B)E6Nid3%V',
  database: "6ure_requests",
  waitForConnections: true,
  connectionLimit: 2,
};

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? "";

// In-memory cache so we don't fetch the same user twice
const userCache = new Map<string, string>();

async function fetchDiscordUsername(userId: string): Promise<string | null> {
  if (userCache.has(userId)) return userCache.get(userId)!;

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });

    if (res.status === 429) {
      // Rate limited — wait and retry
      const retryAfter = parseFloat(res.headers.get("retry-after") ?? "2") * 1000;
      console.log(`   ⏳ Rate limited, waiting ${retryAfter}ms...`);
      await new Promise((r) => setTimeout(r, retryAfter));
      return fetchDiscordUsername(userId);
    }

    if (!res.ok) {
      console.warn(`   ⚠️  Failed to fetch user ${userId}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const name = data.global_name || data.username || null;
    if (name) userCache.set(userId, name);
    return name;
  } catch (err) {
    console.warn(`   ⚠️  Error fetching user ${userId}:`, (err as Error).message);
    return null;
  }
}

async function main() {
  if (!BOT_TOKEN) {
    console.error("❌ DISCORD_BOT_TOKEN not set");
    process.exit(1);
  }

  const pool = mysql.createPool(DB_CONFIG);

  // Get distinct member IDs that need resolving
  const [rows] = await pool.execute(
    `SELECT DISTINCT discord_member_id FROM resources_items
     WHERE discord_member_id IS NOT NULL AND discord_member_name IS NULL`
  );
  const ids = (rows as { discord_member_id: string }[]).map((r) => r.discord_member_id);

  console.log(`📋 Found ${ids.length} unique Discord user IDs to resolve`);

  let resolved = 0;
  for (const userId of ids) {
    const name = await fetchDiscordUsername(userId);
    if (name) {
      await pool.execute(
        `UPDATE resources_items SET discord_member_name = ? WHERE discord_member_id = ?`,
        [name, userId]
      );
      resolved++;
      if (resolved % 20 === 0) console.log(`   ⏳ Resolved ${resolved}/${ids.length}...`);
    }
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✅ Done! Resolved ${resolved}/${ids.length} usernames`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
