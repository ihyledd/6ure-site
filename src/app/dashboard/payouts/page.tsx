import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { aggregateMonthlyPerLeaker, scoreLeakers, type PoolConfig } from "@/lib/payout-scoring";
import { LeakerPayoutsClient } from "@/components/leaker/LeakerPayoutsClient";

export const metadata = {
  title: "Payouts | Leaker Dashboard",
  robots: "noindex, nofollow",
};

type SnapshotRow = {
  period: string;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  total_filesize_bytes: number;
  total_price_value: number;
  raw_score: number | null;
  normalized_share: number | null;
  is_eligible: number;
  estimated_payout: number | null;
};

export default async function PayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard/payouts");

  const userId = session.user.id;
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const pool = await queryOne<{
    period: string;
    total_pool: string | number;
    mode: "split" | "fixed";
    fixed_amount: string | number | null;
    min_uploads_required: number;
  }>("SELECT period, total_pool, mode, fixed_amount, min_uploads_required FROM payout_pools WHERE period = ?", [currentPeriod]);

  const cfg: PoolConfig = {
    total_pool: pool ? Number(pool.total_pool) : 0,
    mode: pool?.mode ?? "split",
    fixed_amount: pool?.fixed_amount != null ? Number(pool.fixed_amount) : null,
    min_uploads_required: pool?.min_uploads_required ?? 12,
  };

  const aggregates = await aggregateMonthlyPerLeaker(currentPeriod);
  const scored = scoreLeakers(aggregates, cfg);
  const me = scored.find((s) => s.user_id === userId) || null;

  const history = await query<SnapshotRow>(
    `SELECT period, upload_count, total_downloads, total_views, total_filesize_bytes,
            total_price_value, raw_score, normalized_share, is_eligible, estimated_payout
     FROM monthly_upload_snapshots
     WHERE discord_member_id = ?
     ORDER BY period DESC
     LIMIT 24`,
    [userId]
  );

  const userRow = await queryOne<{ paypal_email: string | null; payout_method: string | null }>(
    "SELECT paypal_email, payout_method FROM users WHERE id = ?",
    [userId]
  );

  return (
    <LeakerPayoutsClient
      currentPeriod={currentPeriod}
      poolConfig={cfg}
      me={me}
      history={history}
      initialPaypalEmail={userRow?.paypal_email ?? ""}
    />
  );
}
