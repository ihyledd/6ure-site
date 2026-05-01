import { reconcileAllProtection } from "./src/lib/protection-reconcile";
import { execute, query, queryOne } from "./src/lib/db";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const PROTECTED_DIR = "/home/6ure/plugins/Skript/scripts/Data/protected";

const SKRIPTDATE_TYPE = new yaml.Type("!skriptdate", {
  kind: "scalar",
  construct: (data) => data,
  instanceOf: String,
});
const SKRIPT_SCHEMA = yaml.DEFAULT_SCHEMA.extend([SKRIPTDATE_TYPE]);

function parseEditorFile(content) {
  let parsed;
  try {
    parsed = yaml.load(content, { schema: SKRIPT_SCHEMA });
  } catch (e) {
    console.error("YAML parse error", e);
    return { leaks: [], social: null };
  }
  if (!parsed || typeof parsed !== "object") return { leaks: [], social: null };
  const social = typeof parsed.Social === "string" ? parsed.Social : null;
  const leaks = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "Social") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value;
      if (obj.Name && typeof obj.Name === "string") {
        leaks.push(obj);
      } else {
        for (const [, nestedValue] of Object.entries(obj)) {
          if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue) && nestedValue.Name) {
            leaks.push(nestedValue);
          }
        }
      }
    }
  }
  return { leaks, social };
}

async function importEditor(editorName, raw) {
  const { leaks, social } = parseEditorFile(raw);
  if (leaks.length === 0) return { added: 0, updated: 0 };

  const totalDownloads = leaks.reduce((sum, l) => sum + (l.Counter ?? 0), 0);

  await execute(
    `INSERT INTO resources_editors (name, social_url, total_downloads, resource_count)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       social_url = IF(resources_editors.social_url IS NULL OR resources_editors.social_url = '', VALUES(social_url), resources_editors.social_url),
       updated_at = NOW()`,
    [editorName, social, totalDownloads, leaks.length]
  );
  const editorRow = await queryOne("SELECT id FROM resources_editors WHERE name = ?", [editorName]);
  const editorId = editorRow?.id;
  if (!editorId) return { added: 0, updated: 0 };

  let added = 0;
  let updated = 0;

  for (const leak of leaks) {
    const name = leak.Name ?? "Unknown";
    const existing = await queryOne(
      `SELECT id FROM resources_items WHERE editor_id = ? AND name = ?`,
      [editorId, name]
    );

    const filePathField = leak.Path ?? null;
    const thumbnail = leak.Thumbnail ?? null;
    const placeUrl = leak.Place ?? null;
    const downloadCount = leak.Counter ?? 0;
    const isPremium = leak.Premium === true || leak.Premium === "true" ? 1 : 0;

    const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockMatch = raw.match(new RegExp(nameEscaped + "[\\s\\S]*?(?=\\n\\S|$)"));
    const block = blockMatch ? blockMatch[0] : "";
    const memberId = block.match(/Member:\s*(\d{15,22})/)?.[1] ?? null;
    const guildId = block.match(/Guild:\s*(\d{15,22})/)?.[1] ?? null;
    const messageId = block.match(/Message:\s*(\d{15,22})/)?.[1] ?? null;
    const channelId = block.match(/Channel:\s*(\d{15,22})/)?.[1] ?? null;

    let leakedAt = null;
    if (leak.Date) {
      const dateStr = String(leak.Date).replace(/^!skriptdate\s*'?/, "").replace(/'$/, "");
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) leakedAt = d.toISOString().slice(0, 19).replace("T", " ");
    }

    if (existing) {
      await execute(
        `UPDATE resources_items
           SET file_path = COALESCE(?, file_path),
               thumbnail_url = COALESCE(?, thumbnail_url),
               place_url = COALESCE(?, place_url),
               download_count = ?,
               is_premium = ?,
               leaked_at = COALESCE(?, leaked_at),
               discord_member_id = COALESCE(?, discord_member_id),
               discord_guild_id = COALESCE(?, discord_guild_id),
               discord_message_id = COALESCE(?, discord_message_id),
               discord_channel_id = COALESCE(?, discord_channel_id),
               is_protected = 1,
               hidden = 1,
               status = 'Hidden'
         WHERE id = ?`,
        [filePathField, thumbnail, placeUrl, downloadCount, isPremium, leakedAt, memberId, guildId, messageId, channelId, existing.id]
      );
      updated++;
    } else {
      await execute(
        `INSERT INTO resources_items
           (editor_id, editor_name, name, file_path, thumbnail_url, place_url,
            download_count, is_premium, leaked_at,
            discord_member_id, discord_guild_id, discord_message_id, discord_channel_id,
            status, is_protected, hidden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Hidden', 1, 1)`,
        [editorId, editorName, name, filePathField, thumbnail, placeUrl, downloadCount, isPremium, leakedAt, memberId, guildId, messageId, channelId]
      );
      added++;
    }
  }

  return { added, updated };
}

async function run() {
  console.log("Starting Import Protected...");
  let editorFiles = [];
  try {
    editorFiles = fs.readdirSync(PROTECTED_DIR).filter(f => f.endsWith(".yml"));
  } catch (e) {
    console.error("Protected directory error", e);
    return;
  }

  let totalAdded = 0;
  let totalUpdated = 0;
  for (const file of editorFiles) {
    const editorName = file.replace(/\.yml$/, "");
    const raw = fs.readFileSync(path.join(PROTECTED_DIR, file), "utf-8");
    const r = await importEditor(editorName, raw);
    totalAdded += r.added;
    totalUpdated += r.updated;
    console.log(`Processed editor: ${editorName} (Added: ${r.added}, Updated: ${r.updated})`);
  }
  console.log(`Import Protected Complete. Total Added: ${totalAdded}, Total Updated: ${totalUpdated}`);

  console.log("Starting Sync Protection...");
  const stats = await reconcileAllProtection();
  console.log("Sync Protection Complete:", stats);

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
