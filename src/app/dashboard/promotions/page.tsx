import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotions", robots: "noindex, nofollow" };

export default async function PromotionsOverviewPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const campaigns = await query<{ id: string; name: string; is_active: boolean }>(
    `SELECT id, name, is_active FROM ad_campaigns ORDER BY created_at DESC`
  );

  const links = await query<{
    id: string; slug: string; resource_name: string; ad_enabled: boolean;
    total_views: number; total_completes: number; total_downloads: number;
  }>(
    `SELECT id, slug, resource_name, ad_enabled, total_views, total_completes, total_downloads
     FROM ad_download_links ORDER BY created_at DESC LIMIT 10`
  );

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.is_active).length,
    totalLinks: links.length,
    totalViews: links.reduce((s, l) => s + (l.total_views ?? 0), 0),
    totalDownloads: links.reduce((s, l) => s + (l.total_downloads ?? 0), 0),
  };

  return (
    <>
      <div className="dash-header">
        <h2 className="dash-title">Promotions</h2>
        <p className="dash-subtitle">Manage ad-gated download links and campaigns</p>
      </div>

      {/* Quick stats */}
      <div className="promo-stats-grid">
        <div className="promo-stat-card">
          <span className="promo-stat-value">{stats.activeCampaigns}</span>
          <span className="promo-stat-label">Active Campaigns</span>
        </div>
        <div className="promo-stat-card">
          <span className="promo-stat-value">{stats.totalLinks}</span>
          <span className="promo-stat-label">Download Links</span>
        </div>
        <div className="promo-stat-card">
          <span className="promo-stat-value">{stats.totalViews.toLocaleString()}</span>
          <span className="promo-stat-label">Total Views</span>
        </div>
        <div className="promo-stat-card">
          <span className="promo-stat-value">{stats.totalDownloads.toLocaleString()}</span>
          <span className="promo-stat-label">Total Downloads</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="promo-actions-row">
        <Link href="/dashboard/promotions/campaigns/new" className="promo-action-btn promo-action-primary">
          + New Campaign
        </Link>
        <Link href="/dashboard/promotions/links/new" className="promo-action-btn">
          + New Download Link
        </Link>
        <Link href="/dashboard/promotions/analytics" className="promo-action-btn">
          View Analytics
        </Link>
      </div>

      {/* Recent links */}
      {links.length > 0 && (
        <div className="promo-section">
          <h3 className="promo-section-title">Recent Download Links</h3>
          <div className="promo-table-wrap">
            <table className="promo-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Slug</th>
                  <th>Ad</th>
                  <th>Views</th>
                  <th>Completes</th>
                  <th>Downloads</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <Link href={`/dashboard/promotions/links/${link.id}/edit`} className="promo-link-name">
                        {link.resource_name}
                      </Link>
                    </td>
                    <td><code className="promo-slug">/download/{link.slug}</code></td>
                    <td>
                      <span className={`promo-badge ${link.ad_enabled ? "promo-badge-active" : "promo-badge-off"}`}>
                        {link.ad_enabled ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td>{link.total_views}</td>
                    <td>{link.total_completes}</td>
                    <td>{link.total_downloads}</td>
                    <td>
                      {link.total_views > 0
                        ? `${Math.round((link.total_downloads / link.total_views) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
