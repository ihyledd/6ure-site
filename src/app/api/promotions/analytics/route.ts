/**
 * GET /api/promotions/analytics — aggregated analytics (admin only)
 * Query params: ?days=7 (default 30), ?linkId=..., ?campaignId=...
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const linkId = searchParams.get("linkId");
  const campaignId = searchParams.get("campaignId");

  const dateFilter = `AND e.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
  const baseParams: unknown[] = [days];

  let linkFilter = "";
  if (linkId) {
    linkFilter = `AND e.link_id = ?`;
    baseParams.push(linkId);
  }

  let campaignFilter = "";
  if (campaignId) {
    campaignFilter = `AND l.campaignId = ?`;
    baseParams.push(campaignId);
  }

  // Summary totals
  const summary = await queryOne<{
    totalViews: number;
    totalAdStarts: number;
    totalCompletes: number;
    totalSponsorClicks: number;
    totalDownloads: number;
    uniqueVisitors: number;
  }>(
    `SELECT
       SUM(CASE WHEN e.eventType = 'view' THEN 1 ELSE 0 END) as totalViews,
       SUM(CASE WHEN e.eventType = 'ad_start' THEN 1 ELSE 0 END) as totalAdStarts,
       SUM(CASE WHEN e.eventType = 'ad_complete' THEN 1 ELSE 0 END) as totalCompletes,
       SUM(CASE WHEN e.eventType = 'sponsor_click' THEN 1 ELSE 0 END) as totalSponsorClicks,
       SUM(CASE WHEN e.eventType = 'download' THEN 1 ELSE 0 END) as totalDownloads,
       COUNT(DISTINCT e.ipHash) as uniqueVisitors
     FROM ad_analytics_events e
     LEFT JOIN ad_download_links l ON e.link_id = l.id
     WHERE 1=1 ${dateFilter} ${linkFilter} ${campaignFilter}`,
    baseParams
  );

  // Daily breakdown
  const daily = await query<{
    date: string;
    views: number;
    completes: number;
    downloads: number;
  }>(
    `SELECT
       DATE(e.createdAt) as date,
       SUM(CASE WHEN e.eventType = 'view' THEN 1 ELSE 0 END) as views,
       SUM(CASE WHEN e.eventType = 'ad_complete' THEN 1 ELSE 0 END) as completes,
       SUM(CASE WHEN e.eventType = 'download' THEN 1 ELSE 0 END) as downloads
     FROM ad_analytics_events e
     LEFT JOIN ad_download_links l ON e.link_id = l.id
     WHERE 1=1 ${dateFilter} ${linkFilter} ${campaignFilter}
     GROUP BY DATE(e.createdAt)
     ORDER BY date ASC`,
    baseParams
  );

  // Top links
  const topLinks = await query<{
    linkId: string;
    slug: string;
    resourceName: string;
    views: number;
    completes: number;
    downloads: number;
  }>(
    `SELECT
       l.id as linkId, l.slug, l.resourceName,
       SUM(CASE WHEN e.eventType = 'view' THEN 1 ELSE 0 END) as views,
       SUM(CASE WHEN e.eventType = 'ad_complete' THEN 1 ELSE 0 END) as completes,
       SUM(CASE WHEN e.eventType = 'download' THEN 1 ELSE 0 END) as downloads
     FROM ad_analytics_events e
     JOIN ad_download_links l ON e.link_id = l.id
     WHERE 1=1 ${dateFilter} ${linkFilter} ${campaignFilter}
     GROUP BY l.id, l.slug, l.resourceName
     ORDER BY views DESC
     LIMIT 20`,
    baseParams
  );

  // Referrer breakdown
  const referrers = await query<{ referer: string; count: number }>(
    `SELECT
       COALESCE(e.referer, 'Direct') as referer,
       COUNT(*) as count
     FROM ad_analytics_events e
     LEFT JOIN ad_download_links l ON e.link_id = l.id
     WHERE e.eventType = 'view' ${dateFilter} ${linkFilter} ${campaignFilter}
     GROUP BY e.referer
     ORDER BY count DESC
     LIMIT 20`,
    baseParams
  );

  return NextResponse.json({
    summary: summary ?? {
      totalViews: 0,
      totalAdStarts: 0,
      totalCompletes: 0,
      totalSponsorClicks: 0,
      totalDownloads: 0,
      uniqueVisitors: 0,
    },
    daily,
    topLinks,
    referrers,
  });
}
