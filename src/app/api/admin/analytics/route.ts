/**
 * GET /api/admin/analytics — Revenue & subscriber analytics (developer only)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, queryOne } from "@/lib/db";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";

  const totalRevenue = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED'`);
  const totalRefunded = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(refund_amount), 0) as total FROM payments WHERE status IN ('REFUNDED', 'PARTIALLY_REFUNDED')`);
  const activeSubscribers = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE'`);
  const activePremium = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'PREMIUM'`);
  const activeLP = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'LEAK_PROTECTION'`);

  const todayRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= CURDATE()`);
  const yesterdayRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()`);
  const weekRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
  const lastWeekRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
  const monthRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
  const lastMonthRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
  const yearRev = await queryOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`);

  let dateFormat: string, daysBack: number;
  switch (range) {
    case "7d": dateFormat = "%Y-%m-%d"; daysBack = 7; break;
    case "90d": dateFormat = "%Y-%u"; daysBack = 90; break;
    case "1y": dateFormat = "%Y-%m"; daysBack = 365; break;
    default: dateFormat = "%Y-%m-%d"; daysBack = 30;
  }

  const revenueTimeSeries = await query<{ period: string; revenue: string; count: number }>(
    `SELECT DATE_FORMAT(created_at, ?) as period, COALESCE(SUM(amount), 0) as revenue, COUNT(*) as count FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(NOW(), INTERVAL ${daysBack} DAY) GROUP BY period ORDER BY period ASC`, [dateFormat]
  );

  const revenueByPlan = await query<{ plan_category: string; plan_interval: string; total: string }>(
    `SELECT s.plan_category, s.plan_interval, COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN subscriptions s ON s.id = p.subscription_id WHERE p.status = 'COMPLETED' GROUP BY s.plan_category, s.plan_interval`
  );

  const recentActivity = await query(
    `(SELECT 'payment' as type, p.id, p.amount, p.status, p.created_at, s.plan_category, s.plan_interval, u.username FROM payments p JOIN subscriptions s ON s.id = p.subscription_id LEFT JOIN users u ON u.id = s.user_id ORDER BY p.created_at DESC LIMIT 10)
     UNION ALL
     (SELECT 'subscription' as type, s.id, s.amount, s.status, s.created_at, s.plan_category, s.plan_interval, u.username FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 10)
     ORDER BY created_at DESC LIMIT 10`
  );

  const g = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
  const p = (v: string | undefined) => parseFloat(v ?? "0");

  return NextResponse.json({
    summary: {
      totalRevenue: p(totalRevenue?.total), totalRefunded: p(totalRefunded?.total),
      netRevenue: p(totalRevenue?.total) - p(totalRefunded?.total),
      activeSubscribers: activeSubscribers?.count ?? 0, activePremium: activePremium?.count ?? 0, activeLeakProtection: activeLP?.count ?? 0,
    },
    periods: {
      today: p(todayRev?.total), yesterday: p(yesterdayRev?.total), todayGrowth: g(p(todayRev?.total), p(yesterdayRev?.total)),
      week: p(weekRev?.total), lastWeek: p(lastWeekRev?.total), weekGrowth: g(p(weekRev?.total), p(lastWeekRev?.total)),
      month: p(monthRev?.total), lastMonth: p(lastMonthRev?.total), monthGrowth: g(p(monthRev?.total), p(lastMonthRev?.total)),
      year: p(yearRev?.total),
    },
    charts: { revenue: revenueTimeSeries, revenueByPlan },
    recentActivity,
  });
}
