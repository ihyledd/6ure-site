/**
 * Reconciliation helpers for the protection system.
 *
 * - When a creator is added/updated in `protected_users`, mark all matching
 *   resources_items rows as `is_protected=1, hidden=1`.
 * - When a creator is removed, leave the flags alone (admin can manually unset
 *   per-row from the resource manager).
 * - The cron-friendly `reconcileAllProtection()` function re-applies the rules
 *   for the entire `protected_users` table + `protection_groups` JSON in one pass.
 */

import { execute, query } from "@/lib/db";

export type ReconcileStats = {
  matchedByCreator: number;
  matchedByLink: number;
  matchedByGroupUrl: number;
  matchedByGroupKeyword: number;
  rowsAffected: number;
};

/**
 * Apply protection flags for a single protected user (creator).
 * Matches on resources_items.editor_name vs protected_users.creator_name | display_name,
 * and on resources_editors.social_url vs protected_users.social_link.
 */
export async function applyProtectionForUser(userId: string): Promise<number> {
  const rows = await query<{
    user_id: string;
    creator_name: string | null;
    display_name: string | null;
    social_link: string | null;
  }>(
    `SELECT user_id, creator_name, display_name, social_link FROM protected_users WHERE user_id = ?`,
    [userId]
  );
  const u = rows[0];
  if (!u) return 0;

  const names = [u.creator_name, u.display_name].filter(Boolean) as string[];
  const social = (u.social_link || "").trim();

  let total = 0;

  if (names.length > 0) {
    const placeholders = names.map(() => "LOWER(?)").join(", ");
    const r = await execute(
      `UPDATE resources_items r
        SET r.is_protected = 1, r.hidden = 1, r.status = 'Hidden'
        WHERE LOWER(r.editor_name) IN (${placeholders})`,
      names
    );
    total += (r as { affectedRows?: number }).affectedRows ?? 0;
  }

  if (social) {
    const r = await execute(
      `UPDATE resources_items r
         JOIN resources_editors e ON e.id = r.editor_id
         SET r.is_protected = 1, r.hidden = 1, r.status = 'Hidden'
         WHERE LOWER(e.social_url) = LOWER(?)`,
      [social]
    );
    total += (r as { affectedRows?: number }).affectedRows ?? 0;
  }

  return total;
}

/**
 * Reconcile the entire protection state in one pass.
 * Reads:
 *   - all rows in `protected_users`
 *   - all groups in /home/main/leak_protection_data.json (via protection-links-file lib)
 * Sets `is_protected=1, hidden=1, status='Hidden'` on every matching `resources_items` row.
 */
export async function reconcileAllProtection(): Promise<ReconcileStats> {
  const stats: ReconcileStats = {
    matchedByCreator: 0,
    matchedByLink: 0,
    matchedByGroupUrl: 0,
    matchedByGroupKeyword: 0,
    rowsAffected: 0,
  };

  // 1) Match against protected_users by creator/display name + social_link.
  const users = await query<{
    creator_name: string | null;
    display_name: string | null;
    social_link: string | null;
  }>(
    `SELECT creator_name, display_name, social_link FROM protected_users
      WHERE subscription_ends_at IS NULL OR subscription_ends_at > NOW()`
  );

  for (const u of users) {
    const names = [u.creator_name, u.display_name].filter(Boolean) as string[];
    if (names.length > 0) {
      const placeholders = names.map(() => "LOWER(?)").join(", ");
      const r = await execute(
        `UPDATE resources_items r
          SET r.is_protected = 1, r.hidden = 1, r.status = 'Hidden'
          WHERE LOWER(r.editor_name) IN (${placeholders})
            AND (r.is_protected = 0 OR r.is_protected IS NULL)`,
        names
      );
      const n = (r as { affectedRows?: number }).affectedRows ?? 0;
      stats.matchedByCreator += n;
      stats.rowsAffected += n;
    }
    const social = (u.social_link || "").trim();
    if (social) {
      const r = await execute(
        `UPDATE resources_items r
           JOIN resources_editors e ON e.id = r.editor_id
           SET r.is_protected = 1, r.hidden = 1, r.status = 'Hidden'
           WHERE LOWER(e.social_url) = LOWER(?)
             AND (r.is_protected = 0 OR r.is_protected IS NULL)`,
        [social]
      );
      const n = (r as { affectedRows?: number }).affectedRows ?? 0;
      stats.matchedByLink += n;
      stats.rowsAffected += n;
    }
  }

  // 2) Match against /home/main/leak_protection_data.json groups (URLs + keywords).
  try {
    const { getProtectedLinksFromFile, getProtectionEnabledFromFile } = await import("@/lib/protection-links-file");
    const enabled = await getProtectionEnabledFromFile();
    if (enabled) {
      const links = await getProtectedLinksFromFile();
      for (const l of links) {
        if (l.enabled === false) continue;
        if (l.type === "link") {
          const r = await execute(
            `UPDATE resources_items
              SET is_protected = 1, hidden = 1, status = 'Hidden'
              WHERE LOWER(place_url) = LOWER(?)
                AND (is_protected = 0 OR is_protected IS NULL)`,
            [l.link]
          );
          const n = (r as { affectedRows?: number }).affectedRows ?? 0;
          stats.matchedByGroupUrl += n;
          stats.rowsAffected += n;
        } else if (l.type === "keyword") {
          // Case-insensitive substring match against editor_name OR place_url.
          const r = await execute(
            `UPDATE resources_items
              SET is_protected = 1, hidden = 1, status = 'Hidden'
              WHERE (LOWER(place_url) LIKE LOWER(?) OR LOWER(editor_name) LIKE LOWER(?))
                AND (is_protected = 0 OR is_protected IS NULL)`,
            [`%${l.link}%`, `%${l.link}%`]
          );
          const n = (r as { affectedRows?: number }).affectedRows ?? 0;
          stats.matchedByGroupKeyword += n;
          stats.rowsAffected += n;
        }
      }
    }
  } catch (e) {
    console.warn("[reconcileAllProtection] Group reconcile failed:", (e as Error).message);
  }

  return stats;
}
