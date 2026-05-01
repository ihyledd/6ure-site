/**
 * Update creator_name to the platform username (parsed from URL) in requests and protected_users.
 * Run with: npx tsx scripts/update-request-socials-to-usernames.ts
 * Dry run:  npx tsx scripts/update-request-socials-to-usernames.ts --dry-run
 * Verbose:  npx tsx scripts/update-request-socials-to-usernames.ts --verbose  (show why rows were skipped)
 */

import "dotenv/config";
import { query, execute } from "../src/lib/db";

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

function parseUsernameFromSocialUrl(url: string): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const match = u.pathname.match(/\/@([^/]+)/);
    const raw = match?.[1];
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

async function main() {
  if (DRY_RUN) {
    console.log("[dry-run] No changes will be written.\n");
  }

  let requestsUpdated = 0;
  let protectedUpdated = 0;

  // 1. requests: include rows with TikTok/YouTube URL even if creator_platform is NULL
  const requests = await query<{
    id: number;
    creator_url: string;
    creator_name: string | null;
    creator_platform: string | null;
  }>(
    `SELECT id, creator_url, creator_name, creator_platform FROM requests
     WHERE creator_url IS NOT NULL AND TRIM(creator_url) != ''
       AND (creator_platform IN ('tiktok', 'youtube')
            OR creator_url LIKE '%tiktok.com%'
            OR creator_url LIKE '%youtube.com%'
            OR creator_url LIKE '%youtu.be%')`
  );

  console.log(`Requests: found ${requests.length} rows with TikTok/YouTube creator_url`);

  for (const row of requests) {
    const username = parseUsernameFromSocialUrl(row.creator_url);
    const current = (row.creator_name ?? "").trim();
    if (username && username !== current) {
      if (DRY_RUN) {
        console.log(`  [dry-run] request id=${row.id}: creator_name "${current}" -> "${username}"`);
      } else {
        await execute("UPDATE requests SET creator_name = ? WHERE id = ?", [username, row.id]);
      }
      requestsUpdated++;
    } else if (VERBOSE) {
      if (!username) {
        console.log(`  skip id=${row.id}: no @handle in URL (creator_name="${current}")`);
      } else {
        console.log(`  skip id=${row.id}: already username "${current}"`);
      }
    }
  }

  console.log(`Requests: updated ${requestsUpdated} row(s)\n`);

  // 2. protected_users: include rows with TikTok/YouTube URL even if creator_platform is NULL
  const protectedUsers = await query<{
    user_id: string;
    social_link: string;
    creator_name: string | null;
    creator_platform: string | null;
  }>(
    `SELECT user_id, social_link, creator_name, creator_platform FROM protected_users
     WHERE social_link IS NOT NULL AND TRIM(social_link) != ''
       AND (creator_platform IN ('tiktok', 'youtube')
            OR social_link LIKE '%tiktok.com%'
            OR social_link LIKE '%youtube.com%'
            OR social_link LIKE '%youtu.be%')`
  );

  console.log(`Protected users: found ${protectedUsers.length} rows with TikTok/YouTube social_link`);

  for (const row of protectedUsers) {
    const username = parseUsernameFromSocialUrl(row.social_link);
    const current = (row.creator_name ?? "").trim();
    if (username && username !== current) {
      if (DRY_RUN) {
        console.log(`  [dry-run] protected user_id=${row.user_id}: creator_name "${current}" -> "${username}"`);
      } else {
        await execute("UPDATE protected_users SET creator_name = ? WHERE user_id = ?", [username, row.user_id]);
      }
      protectedUpdated++;
    } else if (VERBOSE) {
      if (!username) {
        console.log(`  skip user_id=${row.user_id}: no @handle in URL (creator_name="${current}")`);
      } else {
        console.log(`  skip user_id=${row.user_id}: already username "${current}"`);
      }
    }
  }

  console.log(`Protected users: updated ${protectedUpdated} row(s)`);

  if (DRY_RUN && (requestsUpdated > 0 || protectedUpdated > 0)) {
    console.log("\n[dry-run] Run without --dry-run to apply changes.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
