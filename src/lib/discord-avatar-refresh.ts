/**
 * Check Discord user avatars for availability.
 * When CDN URL is unreachable or local file is missing, fetch from Discord API,
 * save to public/uploads/creator-avatars/, and update users.avatar.
 * Runs on startup and periodically via DISCORD_AVATAR_REFRESH_INTERVAL_MS.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { query, execute } from "@/lib/db";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const UPLOADS_DIR = join(process.cwd(), "public", "uploads", "creator-avatars");
const PERMANENT_PATH_PREFIX = "/uploads/creator-avatars/";
const HEAD_TIMEOUT_MS = 5000;
const DELAY_BETWEEN_ITEMS_MS = 250;

function ensureUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function isLocalPath(avatar: string): boolean {
  const u = avatar.trim();
  return u.startsWith("/") || u.includes(PERMANENT_PATH_PREFIX);
}

function getCdnUrl(userId: string, avatarHash: string): string {
  const ext = String(avatarHash).startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=128`;
}

async function isUrlReachable(url: string): Promise<boolean> {
  if (!url?.trim()) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
    const res = await fetch(url.trim(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)" },
    });
    clearTimeout(timeout);
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}

/** Fetch Discord user by id (returns avatar hash). */
async function fetchDiscordUserAvatar(userId: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { avatar?: string | null };
    return data.avatar != null ? String(data.avatar) : null;
  } catch {
    return null;
  }
}

/** Download avatar from CDN URL and save to public/uploads/creator-avatars/{userId}.{ext}. */
async function downloadAndSaveDiscordAvatar(
  cdnUrl: string,
  userId: string
): Promise<string | null> {
  if (!cdnUrl?.trim()) return null;
  ensureUploadsDir();
  try {
    const res = await fetch(cdnUrl.trim(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn("[DiscordAvatarRefresh] Download failed HTTP", res.status, "for user", userId);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    let ext = "png";
    if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("jpg") || contentType.includes("jpeg")) ext = "jpg";
    const filename = `${userId}.${ext}`;
    const filepath = join(UPLOADS_DIR, filename);
    writeFileSync(filepath, buffer);
    const result = `${PERMANENT_PATH_PREFIX}${filename}`;
    console.log("[DiscordAvatarRefresh] Saved avatar for user", userId, "->", result);
    return result;
  } catch (e) {
    console.warn("[DiscordAvatarRefresh] Download failed for user", userId, (e as Error).message);
    return null;
  }
}

/** Extract filename from local path. */
function extractFilenameFromPath(path: string): string | null {
  const m = path.match(/\/uploads\/creator-avatars\/([^/?#]+)$/);
  return m ? m[1] : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LEGACY_AVATAR_PATH = "/uploads/creator-avatars/";

function isLegacyAvatarPath(avatar: string): boolean {
  return avatar.includes(LEGACY_AVATAR_PATH);
}

/**
 * One-time migration: fix users with legacy avatar path (/uploads/creator-avatars/xxx) by fetching
 * from Discord API and storing the avatar hash (CDN URL is constructed at display time).
 */
export async function runLegacyDiscordAvatarMigration(): Promise<void> {
  if (!BOT_TOKEN) return;

  try {
    const rows = await query<{ id: string; avatar: string }>(
      `SELECT id, avatar FROM users WHERE avatar LIKE '%/uploads/creator-avatars/%'`
    );
    if (rows.length === 0) return;

    console.log("[DiscordAvatarMigration] Fixing", rows.length, "users with legacy avatar path");
    let updated = 0;
    for (const row of rows) {
      try {
        const avatarHash = await fetchDiscordUserAvatar(row.id);
        if (avatarHash) {
          await execute("UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?", [
            avatarHash,
            row.id,
          ]);
          updated++;
          console.log("[DiscordAvatarMigration] Updated user", row.id, "-> hash");
        } else {
          await execute("UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = ?", [row.id]);
          updated++;
        }
      } catch (e) {
        console.warn("[DiscordAvatarMigration] Error for user", row.id, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }
    if (updated > 0) console.log("[DiscordAvatarMigration] Done. Updated", updated, "users.");
  } catch (e) {
    console.warn("[DiscordAvatarMigration] Failed:", (e as Error).message);
  }
}

/** Run once: check and refresh Discord user avatars. */
export async function runDiscordAvatarRefresh(): Promise<void> {
  if (!BOT_TOKEN) {
    console.log("[DiscordAvatarRefresh] DISCORD_BOT_TOKEN not set, skipping.");
    return;
  }

  try {
    console.log("[DiscordAvatarRefresh] Starting Discord user avatar refresh...");
    const rows = await query<{ id: string; avatar: string | null }>(
      `SELECT id, avatar FROM users WHERE avatar IS NOT NULL AND TRIM(avatar) != ''`
    );

    let updated = 0;

    for (const row of rows) {
      const userId = row.id;
      const avatar = (row.avatar ?? "").trim();
      if (!avatar) continue;

      try {
        let needsRefresh = false;

        if (isLocalPath(avatar)) {
          if (isLegacyAvatarPath(avatar)) {
            console.log("[DiscordAvatarRefresh] Legacy avatar path for user", userId, "| path:", avatar);
            needsRefresh = true;
          } else {
            const filename = extractFilenameFromPath(avatar);
            if (!filename) continue;
            const filepath = join(UPLOADS_DIR, filename);
            if (!existsSync(filepath)) {
              console.log("[DiscordAvatarRefresh] Local file missing for user", userId, "| path:", avatar);
              needsRefresh = true;
            }
          }
        } else if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
          const reachable = await isUrlReachable(avatar);
          if (!reachable) {
            console.log("[DiscordAvatarRefresh] CDN URL unreachable for user", userId);
            needsRefresh = true;
          }
        } else {
          const hashCdnUrl = getCdnUrl(userId, avatar);
          const reachable = await isUrlReachable(hashCdnUrl);
          if (!reachable) {
            console.log("[DiscordAvatarRefresh] CDN URL unreachable for user", userId, "| hash:", avatar.slice(0, 8) + "...");
            needsRefresh = true;
          }
        }

        if (needsRefresh) {
          const avatarHash = await fetchDiscordUserAvatar(userId);
          if (avatarHash) {
            if (isLegacyAvatarPath(avatar)) {
              await execute("UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?", [
                avatarHash,
                userId,
              ]);
              updated++;
              console.log("[DiscordAvatarRefresh] Replaced legacy path with hash for user", userId);
            } else {
              const urlToDownload = getCdnUrl(userId, avatarHash);
              const localPath = await downloadAndSaveDiscordAvatar(urlToDownload, userId);
              if (localPath) {
                await execute("UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?", [
                  localPath,
                  userId,
                ]);
                updated++;
              }
            }
          } else {
            console.warn("[DiscordAvatarRefresh] Could not fetch Discord user", userId, "- clearing broken avatar");
            await execute("UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = ?", [userId]);
            updated++;
          }
        }
      } catch (e) {
        console.warn("[DiscordAvatarRefresh] Error for user", userId, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }

    if (updated > 0) {
      console.log("[DiscordAvatarRefresh] Done. Updated", updated, "Discord user avatars.");
    } else {
      console.log("[DiscordAvatarRefresh] Done. No Discord avatars needed updating.");
    }
  } catch (error) {
    console.error("[DiscordAvatarRefresh] Job failed:", (error as Error).message);
  }
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

/** Start periodic refresh. Call from instrumentation. */
export function startDiscordAvatarRefresh(): void {
  const intervalMs =
    parseInt(process.env.DISCORD_AVATAR_REFRESH_INTERVAL_MS ?? "", 10) || 2 * 60 * 60 * 1000;
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  runDiscordAvatarRefresh().catch(() => {});
  refreshIntervalId = setInterval(() => runDiscordAvatarRefresh().catch(() => {}), intervalMs);
  console.log("[DiscordAvatarRefresh] Periodic refresh every", Math.round(intervalMs / 60000), "minutes");
}

/** Stop periodic refresh. */
export function stopDiscordAvatarRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}
