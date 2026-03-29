/**
 * GET /api/admin/analytics
 * Revenue & subscriber analytics data.
 * Developer-only.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, queryOne } from "@/lib/db";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d"; // 7d, 30d, 90d, 1y, all

  // ---- Summary stats ----
  const totalRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED'`
  );

  const totalRefunded = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(refund_amount), 0) as total FROM payments WHERE status IN ('REFUNDED', 'PARTIALLY_REFUNDED')`
  );

  const activeSubscribers = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE'`
  );

  const activePremium = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'PREMIUM'`
  );

  const activeLP = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'LEAK_PROTECTION'`
  );

  // ---- Period comparisons ----
  const todayRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= CURDATE()`
  );

  const yesterdayRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()`
  );

  const weekRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
  );

  const lastWeekRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
  );

  const monthRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );

  const lastMonthRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
  );

  const yearRevenue = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'COMPLETED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`
  );

  // ---- Time series for charts ----
  let interval: string;
  let dateFormat: string;
  let daysBack: number;

  switch (range) {
    case "7d":
      interval = "1 DAY";
      dateFormat = "%Y-%m-%d";
      daysBack = 7;
      break;
    case "30d":
      interval = "1 DAY";
      dateFormat = "%Y-%m-%d";
      daysBack = 30;
      break;
    case "90d":
      interval = "1 WEEK";
      dateFormat = "%Y-%u"; // year-week
      daysBack = 90;
      break;
    case "1y":
      interval = "1 MONTH";
      dateFormat = "%Y-%m";
      daysBack = 365;
      break;
    default:
      interval = "1 MONTH";
      dateFormat = "%Y-%m";
      daysBack = 365 * 5;
  }

  const revenueTimeSeries = await query<{ period: string; revenue: string; count: number }>(
    `SELECT DATE_FORMAT(created_at, ?) as period,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as count
     FROM payments
     WHERE status = 'COMPLETED'
       AND created_at >= DATE_SUB(NOW(), INTERVAL ${daysBack} DAY)
     GROUP BY period
     ORDER BY period ASC`,
    [dateFormat]
  );

  const subscriberTimeSeries = await query<{ period: string; new_subs: number; cancellations: number }>(
    `SELECT DATE_FORMAT(created_at, ?) as period,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as new_subs,
            SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancellations
     FROM subscriptions
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${daysBack} DAY)
     GROUP BY period
     ORDER BY period ASC`,
    [dateFormat]
  );

  // Revenue by plan
  const revenueByPlan = await query<{ plan_category: string; plan_interval: string; total: string }>(
    `SELECT s.plan_category, s.plan_interval, COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN subscriptions s ON s.id = p.subscription_id
     WHERE p.status = 'COMPLETED'
     GROUP BY s.plan_category, s.plan_interval`
  );

  // Recent activity (last 10 events)
  const recentActivity = await query(
    `(SELECT 'payment' as type, p.id, p.amount, p.status, p.created_at, s.plan_category, s.plan_interval, u.username
      FROM payments p
      JOIN subscriptions s ON s.id = p.subscription_id
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY p.created_at DESC LIMIT 10)
     UNION ALL
     (SELECT 'subscription' as type, s.id, s.amount, s.status, s.created_at, s.plan_category, s.plan_interval, u.username
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC LIMIT 10)
     ORDER BY created_at DESC LIMIT 10`
  );

  // Growth calculations
  const calcGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return NextResponse.json({
    summary: {
      totalRevenue: parseFloat(totalRevenue?.total ?? "0"),
      totalRefunded: parseFloat(totalRefunded?.total ?? "0"),
      netRevenue: parseFloat(totalRevenue?.total ?? "0") - parseFloat(totalRefunded?.total ?? "0"),
      activeSubscribers: activeSubscribers?.count ?? 0,
      activePremium: activePremium?.count ?? 0,
      activeLeakProtection: activeLP?.count ?? 0,
    },
    periods: {
      today: parseFloat(todayRevenue?.total ?? "0"),
      yesterday: parseFloat(yesterdayRevenue?.total ?? "0"),
      todayGrowth: calcGrowth(
        parseFloat(todayRevenue?.total ?? "0"),
        parseFloat(yesterdayRevenue?.total ?? "0")
      ),
      week: parseFloat(weekRevenue?.total ?? "0"),
      lastWeek: parseFloat(lastWeekRevenue?.total ?? "0"),
      weekGrowth: calcGrowth(
        parseFloat(weekRevenue?.total ?? "0"),
        parseFloat(lastWeekRevenue?.total ?? "0")
      ),
      month: parseFloat(monthRevenue?.total ?? "0"),
      lastMonth: parseFloat(lastMonthRevenue?.total ?? "0"),
      monthGrowth: calcGrowth(
        parseFloat(monthRevenue?.total ?? "0"),
        parseFloat(lastMonthRevenue?.total ?? "0")
      ),
      year: parseFloat(yearRevenue?.total ?? "0"),
    },
    charts: {
      revenue: revenueTimeSeries,
      subscribers: subscriberTimeSeries,
      revenueByPlan,
    },
    recentActivity,
  });
}
