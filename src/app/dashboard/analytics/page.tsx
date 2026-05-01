import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { LeakerAnalyticsClient } from "@/components/leaker/LeakerAnalyticsClient";

export const metadata = {
  title: "Analytics | Leaker Dashboard",
};

type MonthRow = {
  period: string;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  raw_score: number | null;
  estimated_payout: number | null;
  is_eligible: number;
};

type ResourceRow = {
  id: number;
  name: string;
  thumbnail_url: string | null;
  category: string | null;
  download_count: number;
  view_count: number;
  is_premium: number;
  leaked_at: string;
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard/analytics");

  const userId = session.user.id;

  const lifetime = await queryOne<{ count: number; downloads: number; views: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(download_count), 0) as downloads, COALESCE(SUM(view_count), 0) as views
     FROM resources_items
     WHERE discord_member_id = ?`,
    [userId]
  );

  const monthly = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM resources_items
     WHERE discord_member_id = ? AND leaked_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
    [userId]
  );

  const weekly = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM resources_items
     WHERE discord_member_id = ? AND leaked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
    [userId]
  );

  const daily = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM resources_items
     WHERE discord_member_id = ? AND leaked_at >= CURDATE()`,
    [userId]
  );

  // Monthly breakdown for the last 12 months — combine snapshots + live current month.
  const snapshots = await query<MonthRow>(
    `SELECT period, upload_count, total_downloads, total_views, raw_score, estimated_payout, is_eligible
     FROM monthly_upload_snapshots
     WHERE discord_member_id = ?
     ORDER BY period DESC
     LIMIT 12`,
    [userId]
  );

  // Live current month if not in snapshots
  const currentPeriod = new Date().toISOString().slice(0, 7);
  let combined = snapshots as MonthRow[];
  if (!combined.find(m => m.period === currentPeriod)) {
    const liveCurrent = await queryOne<{ count: number; downloads: number; views: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(download_count), 0) as downloads, COALESCE(SUM(view_count), 0) as views
       FROM resources_items
       WHERE discord_member_id = ? AND DATE_FORMAT(leaked_at, '%Y-%m') = ?`,
      [userId, currentPeriod]
    );
    combined = [{
      period: currentPeriod,
      upload_count: Number(liveCurrent?.count || 0),
      total_downloads: Number(liveCurrent?.downloads || 0),
      total_views: Number(liveCurrent?.views || 0),
      raw_score: null,
      estimated_payout: null,
      is_eligible: Number(liveCurrent?.count || 0) >= 12 ? 1 : 0,
    }, ...combined];
  }

  const recent = await query<ResourceRow>(
    `SELECT id, name, thumbnail_url, category, download_count, view_count, is_premium, leaked_at
     FROM resources_items
     WHERE discord_member_id = ?
     ORDER BY leaked_at DESC
     LIMIT 50`,
    [userId]
  );

  return (
    <LeakerAnalyticsClient
      lifetime={{
        count: Number(lifetime?.count || 0),
        downloads: Number(lifetime?.downloads || 0),
        views: Number(lifetime?.views || 0),
      }}
      monthlyCount={Number(monthly?.count || 0)}
      weeklyCount={Number(weekly?.count || 0)}
      dailyCount={Number(daily?.count || 0)}
      monthHistory={combined}
      recent={recent}
    />
  );
}
