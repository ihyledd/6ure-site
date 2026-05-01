/**
 * GET /api/admin/analytics — Admin subscription analytics and revenue stats.
 * Coerces all numeric values from MySQL to Number to prevent client-side .toFixed() crashes.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionAnalyticsTimeSeries, getSubscriptionStats } from "@/lib/dal/subscriptions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  try {
    const [stats, series] = await Promise.all([getSubscriptionStats(), getSubscriptionAnalyticsTimeSeries(12)]);
    return NextResponse.json({
      totalActive: Number(stats.totalActive) || 0,
      totalRevenue: Number(stats.totalRevenue) || 0,
      totalRefunded: Number(stats.totalRefunded) || 0,
      mrr: Number(stats.mrr) || 0,
      premiumActive: Number(stats.premiumActive) || 0,
      lpActive: Number(stats.lpActive) || 0,
      totalCancelled: Number(stats.totalCancelled) || 0,
      series: series.map(s => ({
        month: s.month,
        netRevenue: Number(s.netRevenue) || 0,
        refunds: Number(s.refunds) || 0,
        newSubscriptions: Number(s.newSubscriptions) || 0,
        cancellations: Number(s.cancellations) || 0,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/admin/analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
