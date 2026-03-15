/**
 * Check and renew TikTok/YouTube social media creator avatar URLs when they expire.
 * Runs periodically via CREATOR_AVATAR_REFRESH_INTERVAL_MS (default 2h).
 * Uses enrichCreator from api.hlx.li; stores external URLs only (no local storage).
 * Legacy URLs (/uploads/creator-avatars/) are always renewed via enrichCreator.
 * Each unique creator (creator_url) is checked only once per run.
 */

import { query, execute } from "@/lib/db";
import { enrichCreator, isAllowedCreatorDomain } from "@/lib/scraper";

const LEGACY_PATH_PREFIX = "/uploads/creator-avatars/";
const HEAD_TIMEOUT_MS = 5000;
const DELAY_BETWEEN_ITEMS_MS = 300;

function isLegacyAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  return u.includes(LEGACY_PATH_PREFIX) || u.includes("/uploads/creator-avatars/");
}

async function isCreatorAvatarUrlReachable(url: string): Promise<boolean> {
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

/**
 * If currentAvatarUrl is legacy (/uploads/creator-avatars/), empty, or unreachable, fetch via enrichCreator and return new external URL.
 * Otherwise return current URL.
 */
async function renewCreatorAvatarIfNeeded(
  creatorUrl: string,
  currentAvatarUrl: string | null
): Promise<{ ok: true; avatar: string } | { ok: false }> {
  if (!creatorUrl?.trim()) return { ok: false };
  if (!isAllowedCreatorDomain(creatorUrl)) return { ok: false };

  const trimmed = (currentAvatarUrl ?? "").trim();
  if (trimmed && !isLegacyAvatarUrl(currentAvatarUrl)) {
    const reachable = await isCreatorAvatarUrlReachable(trimmed);
    if (reachable) return { ok: true, avatar: trimmed };
    console.log("[CreatorAvatarRefresh] Social media creator avatar URL unreachable | creator:", creatorUrl);
  } else if (trimmed) {
    console.log("[CreatorAvatarRefresh] Social media creator avatar legacy URL, renewing | creator:", creatorUrl);
    // Always renew legacy URLs – files no longer exist
  } else if (!trimmed) {
    console.log("[CreatorAvatarRefresh] Social media creator avatar missing, fetching | creator:", creatorUrl);
    // No avatar yet – fetch from enrichCreator
  }

  console.log("[CreatorAvatarRefresh] Fetching social media creator avatar via enrichCreator | creator:", creatorUrl);
  const enriched = await enrichCreator(creatorUrl);
  const newUrl = enriched?.avatar ?? null;
  if (!newUrl) {
    console.warn("[CreatorAvatarRefresh] enrichCreator returned no avatar | creator:", creatorUrl);
    return { ok: false };
  }

  console.log("[CreatorAvatarRefresh] Got new avatar URL | creator:", creatorUrl);
  return { ok: true, avatar: newUrl };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize creator URL for deduplication (lowercase, trimmed). */
function normalizeCreatorUrl(url: string): string {
  return url.trim().toLowerCase();
}

/**
 * One-time migration: fix requests and protected_users with legacy creator_avatar (/uploads/creator-avatars/)
 * by fetching external URLs (e.g. TikTok CDN). Run on startup to fix existing bad data immediately.
 */
export async function runLegacyCreatorAvatarMigration(): Promise<void> {
  const apiKey = (process.env.SCRAPE_API_KEY ?? "").trim();
  if (!apiKey) return;

  try {
    const legacyRequests = await query<{ id: number; creator_url: string }>(
      `SELECT id, creator_url FROM requests
       WHERE creator_avatar LIKE '%/uploads/creator-avatars/%'
         AND creator_url IS NOT NULL AND TRIM(creator_url) != ''
         AND (creator_url LIKE '%tiktok.com%' OR creator_url LIKE '%youtube.com%' OR creator_url LIKE '%youtu.be%')`
    );
    const legacyProtected = await query<{ user_id: string; social_link: string }>(
      `SELECT user_id, social_link FROM protected_users
       WHERE creator_avatar LIKE '%/uploads/creator-avatars/%'
         AND social_link IS NOT NULL AND TRIM(social_link) != ''
         AND (social_link LIKE '%tiktok.com%' OR social_link LIKE '%youtube.com%' OR social_link LIKE '%youtu.be%')`
    );
    if (legacyRequests.length === 0 && legacyProtected.length === 0) return;

    type Entry = { requestIds: number[]; protectedUserIds: string[] };
    const byCreator = new Map<string, Entry>();
    for (const row of legacyRequests) {
      const key = normalizeCreatorUrl(row.creator_url);
      const e = byCreator.get(key) ?? { requestIds: [], protectedUserIds: [] };
      e.requestIds.push(row.id);
      byCreator.set(key, e);
    }
    for (const row of legacyProtected) {
      const key = normalizeCreatorUrl(row.social_link);
      const e = byCreator.get(key) ?? { requestIds: [], protectedUserIds: [] };
      e.protectedUserIds.push(row.user_id);
      byCreator.set(key, e);
    }

    const total = legacyRequests.length + legacyProtected.length;
    console.log("[CreatorAvatarMigration] Fixing", total, "rows with legacy creator_avatar for", byCreator.size, "creators");
    let updated = 0;
    for (const [key, entry] of byCreator) {
      const creatorUrl =
        legacyRequests.find((r) => normalizeCreatorUrl(r.creator_url) === key)?.creator_url ??
        legacyProtected.find((p) => normalizeCreatorUrl(p.social_link) === key)?.social_link ??
        key;
      if (!isAllowedCreatorDomain(creatorUrl)) continue;
      try {
        const enriched = await enrichCreator(creatorUrl);
        const newUrl = enriched?.avatar ?? null;
        if (!newUrl) continue;
        for (const id of entry.requestIds) {
          await execute("UPDATE requests SET creator_avatar = ?, updated_at = NOW() WHERE id = ?", [newUrl, id]);
          updated++;
        }
        for (const userId of entry.protectedUserIds) {
          await execute("UPDATE protected_users SET creator_avatar = ? WHERE user_id = ?", [newUrl, userId]);
          updated++;
        }
        if (entry.requestIds.length > 0 || entry.protectedUserIds.length > 0) {
          console.log("[CreatorAvatarMigration] Updated creator:", creatorUrl, "| requests:", entry.requestIds.length, "protected:", entry.protectedUserIds.length);
        }
      } catch (e) {
        console.warn("[CreatorAvatarMigration] Error for", creatorUrl, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }
    if (updated > 0) console.log("[CreatorAvatarMigration] Done. Updated", updated, "rows.");
  } catch (e) {
    console.warn("[CreatorAvatarMigration] Failed:", (e as Error).message);
  }
}

/** Run once: check and renew social media creator avatars. Each creator is checked only once. */
export async function runCreatorAvatarRefresh(): Promise<void> {
  const apiKey = (process.env.SCRAPE_API_KEY ?? "").trim();
  if (!apiKey) {
    console.log("[CreatorAvatarRefresh] SCRAPE_API_KEY not set, skipping.");
    return;
  }

  try {
    console.log("[CreatorAvatarRefresh] Starting social media creator avatar refresh...");
    // Include: tiktok/youtube platform OR legacy creator_avatar (/uploads/creator-avatars/) – social media creators use external URLs only
    const requests = await query<{ id: number; creator_url: string; creator_avatar: string | null; creator_platform: string }>(
      `SELECT id, creator_url, creator_avatar, creator_platform FROM requests
       WHERE creator_url IS NOT NULL AND TRIM(creator_url) != ''
         AND (creator_url LIKE '%tiktok.com%' OR creator_url LIKE '%youtube.com%' OR creator_url LIKE '%youtu.be%')
         AND (creator_platform IN ('tiktok', 'youtube') OR creator_avatar LIKE '%/uploads/creator-avatars/%')`
    );

    const protectedUsers = await query<{ user_id: string; social_link: string; creator_avatar: string | null; creator_platform: string }>(
      `SELECT user_id, social_link, creator_avatar, creator_platform FROM protected_users
       WHERE social_link IS NOT NULL AND TRIM(social_link) != ''
         AND (social_link LIKE '%tiktok.com%' OR social_link LIKE '%youtube.com%' OR social_link LIKE '%youtu.be%')
         AND (creator_platform IN ('tiktok', 'youtube') OR creator_avatar LIKE '%/uploads/creator-avatars/%')`
    );

    // Deduplicate: collect unique creators (creator_url / social_link) with their current avatar and affected rows
    type CreatorEntry = { avatar: string | null; requestIds: number[]; protectedUserIds: string[] };
    const creators = new Map<string, CreatorEntry>();

    for (const row of requests) {
      const key = normalizeCreatorUrl(row.creator_url);
      const existing = creators.get(key);
      const avatar = (row.creator_avatar ?? "").trim() || null;
      if (existing) {
        existing.requestIds.push(row.id);
        if (!existing.avatar && avatar) existing.avatar = avatar;
      } else {
        creators.set(key, {
          avatar: avatar || null,
          requestIds: [row.id],
          protectedUserIds: [],
        });
      }
    }

    for (const row of protectedUsers) {
      const key = normalizeCreatorUrl(row.social_link);
      const existing = creators.get(key);
      const avatar = (row.creator_avatar ?? "").trim() || null;
      if (existing) {
        existing.protectedUserIds.push(row.user_id);
        if (!existing.avatar && avatar) existing.avatar = avatar;
      } else {
        creators.set(key, {
          avatar: avatar || null,
          requestIds: [],
          protectedUserIds: [row.user_id],
        });
      }
    }

    const uniqueCount = creators.size;
    console.log("[CreatorAvatarRefresh] Checking", uniqueCount, "unique social media creators (from", requests.length, "requests +", protectedUsers.length, "protected users)");

    let requestUpdated = 0;
    let protectedUpdated = 0;

    for (const [creatorUrlKey, entry] of creators) {
      // Get original creator URL for API call (use first request or protected user)
      const creatorUrl = requests.find((r) => normalizeCreatorUrl(r.creator_url) === creatorUrlKey)?.creator_url
        ?? protectedUsers.find((p) => normalizeCreatorUrl(p.social_link) === creatorUrlKey)?.social_link
        ?? creatorUrlKey;

      try {
        const result = await renewCreatorAvatarIfNeeded(creatorUrl, entry.avatar ?? null);
        if (result.ok && result.avatar !== (entry.avatar ?? "")) {
          for (const id of entry.requestIds) {
            await execute("UPDATE requests SET creator_avatar = ?, updated_at = NOW() WHERE id = ?", [
              result.avatar,
              id,
            ]);
            requestUpdated++;
          }
          for (const userId of entry.protectedUserIds) {
            await execute("UPDATE protected_users SET creator_avatar = ? WHERE user_id = ?", [
              result.avatar,
              userId,
            ]);
            protectedUpdated++;
          }
          if (entry.requestIds.length > 0 || entry.protectedUserIds.length > 0) {
            console.log("[CreatorAvatarRefresh] Updated avatar for creator | requests:", entry.requestIds.length, "protected:", entry.protectedUserIds.length);
          }
        }
      } catch (e) {
        console.warn("[CreatorAvatarRefresh] Error for creator:", creatorUrl, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }

    if (requestUpdated > 0 || protectedUpdated > 0) {
      console.log(
        "[CreatorAvatarRefresh] Done. Requests updated:",
        requestUpdated,
        "Protected users updated:",
        protectedUpdated
      );
    } else {
      console.log("[CreatorAvatarRefresh] Done. No social media creator avatars needed updating.");
    }
  } catch (error) {
    console.error("[CreatorAvatarRefresh] Job failed:", (error as Error).message);
  }
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

/** Start periodic refresh. Call from instrumentation or server startup. */
export function startCreatorAvatarRefresh(): void {
  const intervalMs =
    parseInt(process.env.CREATOR_AVATAR_REFRESH_INTERVAL_MS ?? "", 10) || 2 * 60 * 60 * 1000;
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  runCreatorAvatarRefresh().catch(() => {});
  refreshIntervalId = setInterval(() => runCreatorAvatarRefresh().catch(() => {}), intervalMs);
  console.log("[CreatorAvatarRefresh] Periodic refresh every", Math.round(intervalMs / 60000), "minutes");
}

/** Stop periodic refresh. */
export function stopCreatorAvatarRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}
