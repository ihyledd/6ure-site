import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotions", robots: "noindex, nofollow" };

export default async function PromotionsOverviewPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");

  const campaigns = await query<{ id: string; name: string; isActive: boolean }>(
    `SELECT id, name, isActive FROM ad_campaigns ORDER BY createdAt DESC`
  );

  const links = await query<{
    id: string; slug: string; resourceName: string; adEnabled: boolean;
    totalViews: number; totalCompletes: number; totalDownloads: number;
  }>(
    `SELECT id, slug, resourceName, adEnabled, totalViews, totalCompletes, totalDownloads
     FROM ad_download_links ORDER BY createdAt DESC LIMIT 10`
  );

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.isActive).length,
    totalLinks: links.length,
    totalViews: links.reduce((s, l) => s + (l.totalViews ?? 0), 0),
    totalDownloads: links.reduce((s, l) => s + (l.totalDownloads ?? 0), 0),
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
                        {link.resourceName}
                      </Link>
                    </td>
                    <td><code className="promo-slug">/download/{link.slug}</code></td>
                    <td>
                      <span className={`promo-badge ${link.adEnabled ? "promo-badge-active" : "promo-badge-off"}`}>
                        {link.adEnabled ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td>{link.totalViews}</td>
                    <td>{link.totalCompletes}</td>
                    <td>{link.totalDownloads}</td>
                    <td>
                      {link.totalViews > 0
                        ? `${Math.round((link.totalDownloads / link.totalViews) * 100)}%`
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
