import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { auth } from "@/auth";
import { aggregateMonthlyPerLeaker, scoreLeakers, type PoolConfig } from "@/lib/payout-scoring";

/**
 * GET /api/admin/payouts?period=YYYY-MM
 * Returns scored leakers for a month + pool config.
 *
 * - Past months that have a finalized snapshot are served from monthly_upload_snapshots.
 * - Current month is computed live.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = periodParam && /^\d{4}-\d{2}$/.test(periodParam)
    ? periodParam
    : new Date().toISOString().slice(0, 7);

  const pool = await queryOne<{
    id: number;
    period: string;
    total_pool: string | number;
    mode: "split" | "fixed";
    fixed_amount: string | number | null;
    min_uploads_required: number;
    finalized: number;
    notes: string | null;
  }>("SELECT * FROM payout_pools WHERE period = ?", [period]);

  const poolConfig: PoolConfig = {
    total_pool: pool ? Number(pool.total_pool) : 0,
    mode: pool?.mode ?? "split",
    fixed_amount: pool?.fixed_amount != null ? Number(pool.fixed_amount) : null,
    min_uploads_required: pool?.min_uploads_required ?? 12,
  };

  // Try snapshot first if pool is finalized; otherwise compute live.
  let items: any[] = [];
  let isFromSnapshot = false;
  if (pool?.finalized) {
    const snaps = await query<{
      discord_member_id: string;
      discord_member_name: string | null;
      upload_count: number;
      total_downloads: number;
      total_views: number;
      total_filesize_bytes: number;
      total_price_value: number;
      raw_score: string | number;
      normalized_share: string | number;
      is_eligible: number;
      estimated_payout: string | number;
    }>("SELECT * FROM monthly_upload_snapshots WHERE period = ? ORDER BY raw_score DESC", [period]);
    if (snaps.length > 0) {
      isFromSnapshot = true;
      items = snaps.map(s => ({
        user_id: s.discord_member_id,
        user_name: s.discord_member_name,
        upload_count: Number(s.upload_count),
        total_downloads: Number(s.total_downloads),
        total_views: Number(s.total_views),
        total_filesize_bytes: Number(s.total_filesize_bytes),
        total_price_value: Number(s.total_price_value),
        score: Number(s.raw_score),
        normalized: Number(s.normalized_share),
        estimated_payout: Number(s.estimated_payout),
        is_eligible: Number(s.is_eligible) === 1,
        breakdown: { price: 0, downloads: 0, filesize: 0, quantity: 0, engagement: 0 },
      }));
    }
  }
  if (items.length === 0) {
    const rows = await aggregateMonthlyPerLeaker(period);
    items = scoreLeakers(rows, poolConfig);
  }

  return NextResponse.json({
    period,
    pool: pool ? {
      ...pool,
      total_pool: Number(pool.total_pool),
      fixed_amount: pool.fixed_amount != null ? Number(pool.fixed_amount) : null,
      finalized: Number(pool.finalized) === 1,
    } : null,
    items,
    isFromSnapshot,
  });
}

/**
 * PUT /api/admin/payouts
 * Body: { period: "YYYY-MM", total_pool, mode, fixed_amount, min_uploads_required, notes }
 * Upserts the pool config.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const period = String(body.period || "");
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
  }

  const totalPool = Math.max(0, Number(body.total_pool) || 0);
  const mode = body.mode === "fixed" ? "fixed" : "split";
  const fixedAmount = body.fixed_amount != null ? Math.max(0, Number(body.fixed_amount)) : null;
  const minUploads = Math.max(0, Number(body.min_uploads_required) || 12);
  const notes = body.notes ? String(body.notes) : null;

  await execute(
    `INSERT INTO payout_pools (period, total_pool, mode, fixed_amount, min_uploads_required, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_pool = VALUES(total_pool),
       mode = VALUES(mode),
       fixed_amount = VALUES(fixed_amount),
       min_uploads_required = VALUES(min_uploads_required),
       notes = VALUES(notes)`,
    [period, totalPool, mode, fixedAmount, minUploads, notes]
  );

  return NextResponse.json({ success: true });
}

/**
 * POST /api/admin/payouts (action: "finalize" | "snapshot")
 * Body: { period: "YYYY-MM", action: "finalize" | "snapshot" }
 * - "snapshot": writes monthly_upload_snapshots rows from current live data.
 * - "finalize": marks pool finalized = 1 (locks distribution).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const period = String(body.period || "");
  const action = String(body.action || "");
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
  }

  const pool = await queryOne<{
    total_pool: string | number;
    mode: "split" | "fixed";
    fixed_amount: string | number | null;
    min_uploads_required: number;
  }>("SELECT total_pool, mode, fixed_amount, min_uploads_required FROM payout_pools WHERE period = ?", [period]);

  const poolConfig: PoolConfig = {
    total_pool: pool ? Number(pool.total_pool) : 0,
    mode: pool?.mode ?? "split",
    fixed_amount: pool?.fixed_amount != null ? Number(pool.fixed_amount) : null,
    min_uploads_required: pool?.min_uploads_required ?? 12,
  };

  if (action === "snapshot") {
    const rows = await aggregateMonthlyPerLeaker(period);
    const scored = scoreLeakers(rows, poolConfig);
    for (const s of scored) {
      await execute(
        `INSERT INTO monthly_upload_snapshots
          (discord_member_id, discord_member_name, period, upload_count, total_downloads, total_views,
           total_filesize_bytes, total_price_value, raw_score, normalized_share, is_eligible, estimated_payout)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           discord_member_name = VALUES(discord_member_name),
           upload_count = VALUES(upload_count),
           total_downloads = VALUES(total_downloads),
           total_views = VALUES(total_views),
           total_filesize_bytes = VALUES(total_filesize_bytes),
           total_price_value = VALUES(total_price_value),
           raw_score = VALUES(raw_score),
           normalized_share = VALUES(normalized_share),
           is_eligible = VALUES(is_eligible),
           estimated_payout = VALUES(estimated_payout)`,
        [
          s.user_id, s.user_name, period,
          s.upload_count, s.total_downloads, s.total_views,
          s.total_filesize_bytes, s.total_price_value,
          s.score, s.normalized, s.is_eligible ? 1 : 0, s.estimated_payout,
        ]
      );
    }
    return NextResponse.json({ success: true, snapshotted: scored.length });
  }

  if (action === "finalize") {
    if (!pool) return NextResponse.json({ error: "No pool config for this period" }, { status: 400 });
    await execute("UPDATE payout_pools SET finalized = 1 WHERE period = ?", [period]);
    // Also snapshot at finalize-time so the freeze is exact.
    const rows = await aggregateMonthlyPerLeaker(period);
    const scored = scoreLeakers(rows, poolConfig);
    for (const s of scored) {
      await execute(
        `INSERT INTO monthly_upload_snapshots
          (discord_member_id, discord_member_name, period, upload_count, total_downloads, total_views,
           total_filesize_bytes, total_price_value, raw_score, normalized_share, is_eligible, estimated_payout, finalized)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
           finalized = 1`,
        [
          s.user_id, s.user_name, period,
          s.upload_count, s.total_downloads, s.total_views,
          s.total_filesize_bytes, s.total_price_value,
          s.score, s.normalized, s.is_eligible ? 1 : 0, s.estimated_payout,
        ]
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
