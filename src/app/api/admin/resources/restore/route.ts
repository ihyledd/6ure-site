import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { execute, query, queryOne } from "@/lib/db";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const LEAKS_DIR = process.env.LEAKS_DATA_PATH || "/home/6ure/plugins/Skript/scripts/Data/Leaks";

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

// Skript stores dates with a custom !skriptdate tag — treat them as plain strings.
const SKRIPTDATE_TYPE = new yaml.Type("!skriptdate", {
  kind: "scalar",
  construct: (data: string) => data,
  instanceOf: String,
});
const SKRIPT_SCHEMA = yaml.DEFAULT_SCHEMA.extend([SKRIPTDATE_TYPE]);

/**
 * Read a single editor YAML file and return the leak entries it contains,
 * plus the editor's social link (if any).
 */
function parseEditorFile(filePath: string, content: string): { leaks: LeakEntry[]; social: string | null } {
  let parsed: Record<string, unknown>;
  try {
    parsed = yaml.load(content, { schema: SKRIPT_SCHEMA }) as Record<string, unknown>;
  } catch {
    return { leaks: [], social: null };
  }
  if (!parsed || typeof parsed !== "object") return { leaks: [], social: null };

  const social = typeof parsed.Social === "string" ? parsed.Social : null;
  const leaks: LeakEntry[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "Social") continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (obj.Name && typeof obj.Name === "string") {
        leaks.push(obj as unknown as LeakEntry);
      } else {
        for (const [, nestedValue] of Object.entries(obj)) {
          if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue) && (nestedValue as Record<string, unknown>).Name) {
            leaks.push(nestedValue as unknown as LeakEntry);
          }
        }
      }
    }
  }
  return { leaks, social };
}

/**
 * Restore a single editor: upsert editor row + all of their leaks into the DB.
 * Returns counts. Protected resources (already flagged is_protected=1) are NEVER overwritten.
 */
async function restoreEditor(editorName: string, raw: string, options: { unhide: boolean }): Promise<{ added: number; updated: number; skippedProtected: number }> {
  const { leaks, social } = parseEditorFile(`${editorName}.yml`, raw);
  if (leaks.length === 0) return { added: 0, updated: 0, skippedProtected: 0 };

  const totalDownloads = leaks.reduce((sum, l) => sum + (l.Counter ?? 0), 0);

  // Upsert editor.
  await execute(
    `INSERT INTO resources_editors (name, social_url, total_downloads, resource_count)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       social_url = IF(resources_editors.social_url IS NULL OR resources_editors.social_url = '', VALUES(social_url), resources_editors.social_url),
       total_downloads = VALUES(total_downloads),
       resource_count = VALUES(resource_count),
       updated_at = NOW()`,
    [editorName, social, totalDownloads, leaks.length]
  );

  const editorRow = await queryOne<{ id: number }>("SELECT id FROM resources_editors WHERE name = ?", [editorName]);
  const editorId = editorRow?.id;
  if (!editorId) return { added: 0, updated: 0, skippedProtected: 0 };

  let added = 0;
  let updated = 0;
  let skippedProtected = 0;

  for (const leak of leaks) {
    const name = leak.Name ?? "Unknown";

    // Skip protected resources: do not touch their data, do not unhide them.
    const existing = await queryOne<{ id: number; is_protected: number | null; hidden: number | null }>(
      `SELECT id, is_protected, hidden FROM resources_items WHERE editor_id = ? AND name = ?`,
      [editorId, name]
    );
    if (existing && Number(existing.is_protected) === 1) {
      skippedProtected++;
      continue;
    }

    const filePathField = leak.Path ?? null;
    const thumbnail = leak.Thumbnail ?? null;
    const placeUrl = leak.Place ?? null;
    const downloadCount = leak.Counter ?? 0;
    const isPremium = leak.Premium === true || leak.Premium === "true" ? 1 : 0;

    // Extract Discord snowflake IDs via regex on the raw block (avoids JS number precision loss).
    const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockMatch = raw.match(new RegExp(nameEscaped + "[\\s\\S]*?(?=\\n\\S|$)"));
    const block = blockMatch ? blockMatch[0] : "";
    const memberId = block.match(/Member:\s*(\d{15,22})/)?.[1] ?? null;
    const guildId = block.match(/Guild:\s*(\d{15,22})/)?.[1] ?? null;
    const messageId = block.match(/Message:\s*(\d{15,22})/)?.[1] ?? null;
    const channelId = block.match(/Channel:\s*(\d{15,22})/)?.[1] ?? null;

    let leakedAt: string | null = null;
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
               discord_channel_id = COALESCE(?, discord_channel_id)
               ${options.unhide ? ", hidden = 0, status = CASE WHEN status = 'Hidden' THEN 'Completed' ELSE status END" : ""}
         WHERE id = ?`,
        [filePathField, thumbnail, placeUrl, downloadCount, isPremium, leakedAt, memberId, guildId, messageId, channelId, existing.id]
      );
      updated++;
    } else {
      await execute(
        `INSERT INTO resources_items
           (editor_id, editor_name, name, file_path, thumbnail_url, place_url,
            download_count, is_premium, leaked_at,
            discord_member_id, discord_guild_id, discord_message_id, discord_channel_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
        [editorId, editorName, name, filePathField, thumbnail, placeUrl, downloadCount, isPremium, leakedAt, memberId, guildId, messageId, channelId]
      );
      added++;
    }
  }

  return { added, updated, skippedProtected };
}

/**
 * GET /api/admin/resources/restore
 * Returns stats for the dashboard:
 *   - total resources in DB
 *   - count missing channel/message
 *   - protected (skipped) count
 *   - per-editor breakdown of resources missing channels
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const totals = await queryOne<{
    total: number;
    missing_channel: number;
    missing_message: number;
    protected_count: number;
    hidden_count: number;
  }>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN (discord_channel_id IS NULL OR discord_channel_id = '') THEN 1 ELSE 0 END) AS missing_channel,
      SUM(CASE WHEN (discord_message_id IS NULL OR discord_message_id = '') THEN 1 ELSE 0 END) AS missing_message,
      SUM(CASE WHEN is_protected = 1 THEN 1 ELSE 0 END) AS protected_count,
      SUM(CASE WHEN hidden = 1 THEN 1 ELSE 0 END) AS hidden_count
     FROM resources_items`
  );

  const editors = await query<{ editor_name: string; missing: number }>(
    `SELECT editor_name, COUNT(*) AS missing
     FROM resources_items
     WHERE (discord_channel_id IS NULL OR discord_channel_id = '' OR discord_message_id IS NULL OR discord_message_id = '')
       AND (is_protected IS NULL OR is_protected = 0)
     GROUP BY editor_name
     ORDER BY missing DESC
     LIMIT 100`
  );

  // YAML availability check (for the UI to indicate whether full restore is possible).
  let yamlAvailable = false;
  let yamlEditorCount = 0;
  try {
    const stat = fs.statSync(LEAKS_DIR);
    if (stat.isDirectory()) {
      yamlAvailable = true;
      yamlEditorCount = fs.readdirSync(LEAKS_DIR).filter(f => f.endsWith(".yml")).length;
    }
  } catch { /* directory missing */ }

  return NextResponse.json({
    totals: totals || {},
    editors,
    yamlAvailable,
    yamlEditorCount,
  });
}

/**
 * POST /api/admin/resources/restore
 * Body: { scope: "all" | "editor", editor?: string, unhide?: boolean }
 *
 * Re-imports resource data from YAML into the DB:
 *   - Adds back any leaks that exist in YAML but not in the DB (e.g. accidentally deleted)
 *   - Updates existing leaks with the latest YAML values (download_count, file path, etc.)
 *   - When `unhide` is true, also clears the hidden flag for non-protected resources
 *   - Protected resources are SKIPPED in their entirety (not overwritten, not unhidden)
 *
 * Returns aggregate counts. Pure DB operation — does NOT touch Discord.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { scope?: string; editor?: string; unhide?: boolean } = {};
  try { body = await request.json(); } catch {}

  const scope = body.scope === "editor" ? "editor" : "all";
  const editorArg = body.editor?.trim() || null;
  const unhide = !!body.unhide;
  if (scope === "editor" && !editorArg) {
    return NextResponse.json({ error: "editor is required when scope=editor" }, { status: 400 });
  }

  // Make sure the YAML directory exists. If not, the website cannot perform the YAML-side restore.
  let editorFiles: string[] = [];
  try {
    const stat = fs.statSync(LEAKS_DIR);
    if (!stat.isDirectory()) throw new Error("not a directory");
    editorFiles = fs.readdirSync(LEAKS_DIR).filter(f => f.endsWith(".yml"));
  } catch (e: any) {
    return NextResponse.json(
      { error: `Leaks YAML directory is unavailable at ${LEAKS_DIR}: ${e?.message || "unknown error"}` },
      { status: 503 }
    );
  }

  let targetFiles: string[] = editorFiles;
  if (scope === "editor" && editorArg) {
    // Match by case-insensitive filename match.
    const wanted = `${editorArg}.yml`.toLowerCase();
    targetFiles = editorFiles.filter(f => f.toLowerCase() === wanted);
    if (targetFiles.length === 0) {
      return NextResponse.json(
        { error: `No YAML file found for editor "${editorArg}". Make sure the filename matches exactly (case-insensitive).` },
        { status: 404 }
      );
    }
  }

  let added = 0;
  let updated = 0;
  let skippedProtected = 0;
  const failed: { editor: string; error: string }[] = [];

  for (const file of targetFiles) {
    const editorName = file.replace(/\.yml$/, "");
    let raw = "";
    try {
      raw = fs.readFileSync(path.join(LEAKS_DIR, file), "utf-8");
    } catch (e: any) {
      failed.push({ editor: editorName, error: e?.message || "read error" });
      continue;
    }
    try {
      const r = await restoreEditor(editorName, raw, { unhide });
      added += r.added;
      updated += r.updated;
      skippedProtected += r.skippedProtected;
    } catch (e: any) {
      failed.push({ editor: editorName, error: e?.message || "restore error" });
    }
  }

  return NextResponse.json({
    success: true,
    scope,
    editor: editorArg,
    processedEditors: targetFiles.length,
    added,
    updated,
    skippedProtected,
    failed,
    message: `Restored ${added + updated} resource(s) (added ${added}, updated ${updated}). Skipped ${skippedProtected} protected resource(s) across ${targetFiles.length} editor(s).`,
  });
}
