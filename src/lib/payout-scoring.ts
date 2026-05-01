/**
 * Payout scoring engine.
 *
 * Weighted formula: each leaker accumulates points from their resources.
 * Each metric is min-max normalised to [0..1] within the eligible cohort:
 *   price        35%
 *   downloads    25%
 *   filesize     15%
 *   quantity     15%
 *   engagement   10% (views)
 *
 * Final payout per leaker = (their normalized share) * pool.total_pool.
 *
 * Eligibility: upload_count >= pool.min_uploads_required (default 12).
 *
 * Source of truth for past months: monthly_upload_snapshots (frozen).
 * For the current month: computed live from resources_items.
 */
import { query } from "@/lib/db";

export type LeakerAggregate = {
  user_id: string;
  user_name: string | null;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  total_filesize_bytes: number;
  total_price_value: number;
};

export type ScoredLeaker = LeakerAggregate & {
  score: number;
  normalized: number;
  /** EUR (or pool currency) — only set if pool config is provided. */
  estimated_payout: number;
  is_eligible: boolean;
  /** Per-metric contribution (each in [0..1]). */
  breakdown: {
    price: number;
    downloads: number;
    filesize: number;
    quantity: number;
    engagement: number;
  };
};

export const PAYOUT_WEIGHTS = {
  price: 0.35,
  downloads: 0.25,
  filesize: 0.15,
  quantity: 0.15,
  engagement: 0.10,
} as const;

export type PoolConfig = {
  total_pool?: number;
  mode?: "split" | "fixed";
  fixed_amount?: number | null;
  min_uploads_required?: number;
};

function safeDiv(a: number, b: number): number {
  if (!b || !isFinite(b)) return 0;
  return a / b;
}

/**
 * Aggregates resources_items for a given month into per-leaker totals.
 * Only counts rows where counts_for_payout = 1 AND hidden = 0.
 * If `period` is omitted, aggregates the current month.
 */
export async function aggregateMonthlyPerLeaker(period?: string): Promise<LeakerAggregate[]> {
  const yearMonth = period && /^\d{4}-\d{2}$/.test(period)
    ? period
    : new Date().toISOString().slice(0, 7); // YYYY-MM

  // Use DATE_FORMAT(leaked_at, '%Y-%m') = ?
  const rows = await query<LeakerAggregate>(
    `SELECT
        r.discord_member_id AS user_id,
        MAX(r.discord_member_name) AS user_name,
        COUNT(*) AS upload_count,
        COALESCE(SUM(r.download_count), 0) AS total_downloads,
        COALESCE(SUM(r.view_count), 0) AS total_views,
        COALESCE(SUM(r.file_size_bytes), 0) AS total_filesize_bytes,
        COALESCE(SUM(r.price_numeric), 0) AS total_price_value
      FROM resources_items r
      WHERE r.discord_member_id IS NOT NULL AND r.discord_member_id <> ''
        AND DATE_FORMAT(r.leaked_at, '%Y-%m') = ?
        AND (r.hidden = 0 OR r.hidden IS NULL)
        AND (r.counts_for_payout = 1 OR r.counts_for_payout IS NULL)
        AND (r.is_protected = 0 OR r.is_protected IS NULL)
      GROUP BY r.discord_member_id`,
    [yearMonth]
  );
  return rows.map(r => ({
    user_id: String(r.user_id),
    user_name: r.user_name,
    upload_count: Number(r.upload_count) || 0,
    total_downloads: Number(r.total_downloads) || 0,
    total_views: Number(r.total_views) || 0,
    total_filesize_bytes: Number(r.total_filesize_bytes) || 0,
    total_price_value: Number(r.total_price_value) || 0,
  }));
}

/**
 * Score & rank leakers given a list of aggregates and a pool config.
 */
export function scoreLeakers(rows: LeakerAggregate[], pool?: PoolConfig): ScoredLeaker[] {
  const minUploads = pool?.min_uploads_required ?? 12;

  // Decide eligibility BEFORE computing maxes — leakers below threshold do not
  // affect the normalisation distribution.
  const eligibleSet = new Set<string>(rows.filter(r => r.upload_count >= minUploads).map(r => r.user_id));

  const eligibleRows = rows.filter(r => eligibleSet.has(r.user_id));
  const max = {
    price: Math.max(0, ...eligibleRows.map(r => r.total_price_value)),
    downloads: Math.max(0, ...eligibleRows.map(r => r.total_downloads)),
    filesize: Math.max(0, ...eligibleRows.map(r => r.total_filesize_bytes)),
    quantity: Math.max(0, ...eligibleRows.map(r => r.upload_count)),
    engagement: Math.max(0, ...eligibleRows.map(r => r.total_views)),
  };

  // Compute raw weighted score per row (0..1 across all weights summed).
  const scored = rows.map(r => {
    const isEligible = eligibleSet.has(r.user_id);
    const breakdown = {
      price: safeDiv(r.total_price_value, max.price),
      downloads: safeDiv(r.total_downloads, max.downloads),
      filesize: safeDiv(r.total_filesize_bytes, max.filesize),
      quantity: safeDiv(r.upload_count, max.quantity),
      engagement: safeDiv(r.total_views, max.engagement),
    };
    const score =
      breakdown.price * PAYOUT_WEIGHTS.price +
      breakdown.downloads * PAYOUT_WEIGHTS.downloads +
      breakdown.filesize * PAYOUT_WEIGHTS.filesize +
      breakdown.quantity * PAYOUT_WEIGHTS.quantity +
      breakdown.engagement * PAYOUT_WEIGHTS.engagement;
    return { ...r, score, breakdown, is_eligible: isEligible, normalized: 0, estimated_payout: 0 };
  });

  const totalEligibleScore = scored
    .filter(s => s.is_eligible)
    .reduce((acc, s) => acc + s.score, 0);

  // Normalize and compute payouts only for eligible rows.
  for (const s of scored) {
    if (!s.is_eligible) {
      s.normalized = 0;
      s.estimated_payout = 0;
      continue;
    }
    s.normalized = safeDiv(s.score, totalEligibleScore);
    if (pool?.mode === "fixed" && pool.fixed_amount != null) {
      s.estimated_payout = Math.max(0, Number(pool.fixed_amount));
    } else if (pool?.total_pool != null) {
      s.estimated_payout = Math.max(0, s.normalized * Number(pool.total_pool));
    } else {
      s.estimated_payout = 0;
    }
  }

  // Sort eligible first by score desc, then non-eligible by uploads desc.
  scored.sort((a, b) => {
    if (a.is_eligible !== b.is_eligible) return a.is_eligible ? -1 : 1;
    if (a.is_eligible) return b.score - a.score;
    return b.upload_count - a.upload_count;
  });

  return scored;
}
