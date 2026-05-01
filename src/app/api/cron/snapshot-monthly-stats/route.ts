import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { aggregateMonthlyPerLeaker, scoreLeakers, type PoolConfig } from "@/lib/payout-scoring";

/**
 * GET/POST /api/cron/snapshot-monthly-stats
 *
 * Snapshots aggregated leaker stats into monthly_upload_snapshots.
 * Runs the snapshot for the *previous* calendar month by default.
 * Pass ?period=YYYY-MM to override.
 *
 * Auth: ?secret=<CRON_SECRET> or Authorization: Bearer <CRON_SECRET>.
 * Schedule via system cron, e.g. on the 1st of each month at 03:00.
 */
async function run(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (secret !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  let period = url.searchParams.get("period") || "";
  if (!/^\d{4}-\d{2}$/.test(period)) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    period = d.toISOString().slice(0, 7);
  }

  const pool = await queryOne<{
    total_pool: string | number;
    mode: "split" | "fixed";
    fixed_amount: string | number | null;
    min_uploads_required: number;
  }>("SELECT total_pool, mode, fixed_amount, min_uploads_required FROM payout_pools WHERE period = ?", [period]);

  const cfg: PoolConfig = {
    total_pool: pool ? Number(pool.total_pool) : 0,
    mode: pool?.mode ?? "split",
    fixed_amount: pool?.fixed_amount != null ? Number(pool.fixed_amount) : null,
    min_uploads_required: pool?.min_uploads_required ?? 12,
  };

  const rows = await aggregateMonthlyPerLeaker(period);
  const scored = scoreLeakers(rows, cfg);

  for (const s of scored) {
    await execute(
      `INSERT INTO monthly_upload_snapshots
        (discord_member_id, discord_member_name, period, upload_count, total_downloads, total_views,
         total_filesize_bytes, total_price_value, raw_score, normalized_share, is_eligible, estimated_payout)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         upload_count = VALUES(upload_count),
         total_downloads = VALUES(total_downloads),
         total_views = VALUES(total_views),
         total_filesize_bytes = VALUES(total_filesize_bytes),
         total_price_value = VALUES(total_price_value),
         raw_score = VALUES(raw_score),
         normalized_share = VALUES(normalized_share),
         is_eligible = VALUES(is_eligible),
         estimated_payout = VALUES(estimated_payout),
         discord_member_name = VALUES(discord_member_name)`,
      [
        s.user_id, s.user_name, period,
        s.upload_count, s.total_downloads, s.total_views,
        s.total_filesize_bytes, s.total_price_value,
        s.score, s.normalized, s.is_eligible ? 1 : 0, s.estimated_payout,
      ]
    );
  }
  return NextResponse.json({ success: true, period, snapshotted: scored.length });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
