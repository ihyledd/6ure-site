/**
 * Sync leak YAML files into MySQL resources_editors + resources_items tables.
 *
 * Usage: npx tsx scripts/sync-resources.ts
 *
 * Safe to re-run: uses INSERT ... ON DUPLICATE KEY UPDATE (upsert).
 * Does NOT modify the original YAML files.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import mysql from "mysql2/promise";

const LEAKS_DIR = "/home/6ure/plugins/Skript/scripts/Data/Leaks";

const DB_CONFIG: mysql.PoolOptions = {
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? 'B)E6Nid3%V',
  database: process.env.DB_NAME ?? "6ure_requests",
  waitForConnections: true,
  connectionLimit: 5,
};

interface LeakEntry {
  Name?: string;
  Editor?: string;
  Path?: string;
  Thumbnail?: string;
  Place?: string;
  Counter?: number;
  Premium?: boolean | string;
  Date?: string;
  Member?: string;
  Guild?: string;
  Message?: string;
  Channel?: string;
}

// Custom YAML schema to handle Skript's !skriptdate tag
const SKRIPTDATE_TYPE = new yaml.Type("!skriptdate", {
  kind: "scalar",
  construct: (data: string) => data, // Keep as string, we parse later
  instanceOf: String,
});
const SKRIPT_SCHEMA = yaml.DEFAULT_SCHEMA.extend([SKRIPTDATE_TYPE]);

async function main() {
  const pool = mysql.createPool(DB_CONFIG);

  console.log(`📂 Reading YAML files from: ${LEAKS_DIR}`);
  const files = fs.readdirSync(LEAKS_DIR).filter((f) => f.endsWith(".yml"));
  console.log(`   Found ${files.length} editor files`);

  let totalEditors = 0;
  let totalItems = 0;

  for (const file of files) {
    const filePath = path.join(LEAKS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    let parsed: Record<string, unknown>;
    try {
      parsed = yaml.load(content, { schema: SKRIPT_SCHEMA }) as Record<string, unknown>;
    } catch (e) {
      console.warn(`   ⚠️  Skipping ${file}: YAML parse error - ${(e as Error).message?.slice(0, 80)}`);
      continue;
    }

    if (!parsed || typeof parsed !== "object") continue;

    // Editor name = filename without .yml
    const editorName = file.replace(/\.yml$/, "");

    // Social link is a top-level "Social" key
    const socialUrl = typeof parsed.Social === "string" ? parsed.Social : null;

    // Collect all leak entries (top-level keys that are objects with a "Name" field,
    // or nested objects one level deep that have a "Name" field)
    const leaks: LeakEntry[] = [];

    for (const [key, value] of Object.entries(parsed)) {
      if (key === "Social") continue;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if (obj.Name && typeof obj.Name === "string") {
          // Direct leak entry
          leaks.push(obj as unknown as LeakEntry);
        } else {
          // Might be a nested structure (e.g. "'23':" -> "976 TWIXTOR:" -> {Name: ...})
          for (const [, nestedValue] of Object.entries(obj)) {
            if (
              nestedValue &&
              typeof nestedValue === "object" &&
              !Array.isArray(nestedValue) &&
              (nestedValue as Record<string, unknown>).Name
            ) {
              leaks.push(nestedValue as unknown as LeakEntry);
            }
          }
        }
      }
    }

    if (leaks.length === 0) continue;

    // Calculate total downloads for this editor
    const totalDownloads = leaks.reduce((sum, l) => sum + (l.Counter ?? 0), 0);

    // Upsert editor
    await pool.execute(
      `INSERT INTO resources_editors (name, social_url, total_downloads, resource_count)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         social_url = IF(resources_editors.social_url IS NULL OR resources_editors.social_url = '', VALUES(social_url), resources_editors.social_url),
         total_downloads = VALUES(total_downloads),
         resource_count = VALUES(resource_count),
         updated_at = NOW()`,
      [editorName, socialUrl, String(totalDownloads), String(leaks.length)]
    );
    totalEditors++;

    // Get editor ID
    const [rows] = await pool.execute(
      `SELECT id FROM resources_editors WHERE name = ?`,
      [editorName]
    );
    const editorId = (rows as { id: number }[])[0]?.id;
    if (!editorId) {
      console.warn(`   ⚠️  Could not find editor ID for ${editorName}`);
      continue;
    }

    // Upsert each leak
    for (const leak of leaks) {
      const name = leak.Name ?? "Unknown";
      const filePath = leak.Path ?? null;
      const thumbnail = leak.Thumbnail ?? null;
      const placeUrl = leak.Place ?? null;
      const downloadCount = leak.Counter ?? 0;
      const isPremium = leak.Premium === true || leak.Premium === "true" ? 1 : 0;

      // Extract Discord snowflake IDs from raw file content (regex)
      // to avoid JS Number precision loss on 18+ digit IDs
      const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blockMatch = content.match(new RegExp(nameEscaped + '[\\s\\S]*?(?=\\n\\S|$)'));
      const block = blockMatch ? blockMatch[0] : "";
      const memberId = block.match(/Member:\s*(\d{15,22})/)?.[1] ?? null;
      const guildId = block.match(/Guild:\s*(\d{15,22})/)?.[1] ?? null;
      const messageId = block.match(/Message:\s*(\d{15,22})/)?.[1] ?? null;
      const channelId = block.match(/Channel:\s*(\d{15,22})/)?.[1] ?? null;

      // Parse the Skript date format
      let leakedAt: string | null = null;
      if (leak.Date) {
        const dateStr = String(leak.Date);
        // Handle !skriptdate format or ISO strings
        const cleaned = dateStr
          .replace(/^!skriptdate\s*'?/, "")
          .replace(/'$/, "");
        try {
          const d = new Date(cleaned);
          if (!isNaN(d.getTime())) {
            leakedAt = d.toISOString().slice(0, 19).replace("T", " ");
          }
        } catch {
          // Skip invalid dates
        }
      }

      await pool.execute(
        `INSERT INTO resources_items
           (editor_id, editor_name, name, file_path, thumbnail_url, place_url,
            download_count, is_premium, leaked_at,
            discord_member_id, discord_guild_id, discord_message_id, discord_channel_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           file_path = VALUES(file_path),
           thumbnail_url = VALUES(thumbnail_url),
           place_url = VALUES(place_url),
           download_count = VALUES(download_count),
           is_premium = VALUES(is_premium),
           leaked_at = VALUES(leaked_at),
           discord_member_id = VALUES(discord_member_id),
           discord_guild_id = VALUES(discord_guild_id),
           discord_message_id = VALUES(discord_message_id),
           discord_channel_id = VALUES(discord_channel_id),
           updated_at = NOW()`,
        [
          String(editorId),
          editorName,
          name,
          filePath,
          thumbnail,
          placeUrl,
          String(downloadCount),
          String(isPremium),
          leakedAt,
          memberId,
          guildId,
          messageId,
          channelId,
        ]
      );
      totalItems++;
    }

    if (totalEditors % 50 === 0) {
      console.log(`   ⏳ Processed ${totalEditors}/${files.length} editors...`);
    }
  }

  console.log(`\n✅ Sync complete!`);
  console.log(`   Editors: ${totalEditors}`);
  console.log(`   Resources: ${totalItems}`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
