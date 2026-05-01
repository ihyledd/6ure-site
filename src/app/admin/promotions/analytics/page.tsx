"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  summary: {
    totalViews: number;
    totalAdStarts: number;
    totalCompletes: number;
    totalSponsorClicks: number;
    totalDownloads: number;
    uniqueVisitors: number;
  };
  daily: { date: string; views: number; completes: number; downloads: number }[];
  topLinks: { linkId: string; slug: string; resource_name: string; views: number; completes: number; downloads: number }[];
  referrers: { referer: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/promotions/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const s = data?.summary;
  const completionRate = s && s.totalViews > 0 ? Math.round((s.totalCompletes / s.totalViews) * 100) : 0;
  const downloadRate = s && s.totalCompletes > 0 ? Math.round((s.totalDownloads / s.totalCompletes) * 100) : 0;

  // Simple sparkline bar chart
  const maxDaily = Math.max(...(data?.daily?.map((d) => d.views) ?? [1]));

  return (
    <>
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Ad Analytics</h2>
          <p className="dash-subtitle">Track ad performance and download conversions</p>
        </div>
        <div className="promo-date-range">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`promo-date-btn ${days === d ? "promo-date-btn-active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="promo-loading">Loading analytics...</p>
      ) : !data ? (
        <p className="promo-loading">No data available</p>
      ) : (
        <>
          {/* Key metrics */}
          <div className="promo-stats-grid promo-stats-grid-6">
            <div className="promo-stat-card">
              <span className="promo-stat-value">{(s?.totalViews ?? 0).toLocaleString()}</span>
              <span className="promo-stat-label">Page Views</span>
            </div>
            <div className="promo-stat-card">
              <span className="promo-stat-value">{(s?.uniqueVisitors ?? 0).toLocaleString()}</span>
              <span className="promo-stat-label">Unique Visitors</span>
            </div>
            <div className="promo-stat-card">
              <span className="promo-stat-value">{(s?.totalCompletes ?? 0).toLocaleString()}</span>
              <span className="promo-stat-label">Ad Completions</span>
            </div>
            <div className="promo-stat-card">
              <span className="promo-stat-value">{completionRate}%</span>
              <span className="promo-stat-label">Completion Rate</span>
            </div>
            <div className="promo-stat-card">
              <span className="promo-stat-value">{(s?.totalDownloads ?? 0).toLocaleString()}</span>
              <span className="promo-stat-label">Downloads</span>
            </div>
            <div className="promo-stat-card">
              <span className="promo-stat-value">{downloadRate}%</span>
              <span className="promo-stat-label">Download Rate</span>
            </div>
          </div>

          {/* Sponsor clicks */}
          {(s?.totalSponsorClicks ?? 0) > 0 && (
            <div className="promo-stat-card promo-stat-card-wide">
              <span className="promo-stat-value">{s?.totalSponsorClicks.toLocaleString()}</span>
              <span className="promo-stat-label">Sponsor CTA Clicks</span>
            </div>
          )}

          {/* Daily chart */}
          {data.daily.length > 0 && (
            <div className="promo-section">
              <h3 className="promo-section-title">Daily Breakdown</h3>
              <div className="promo-chart">
                {data.daily.map((d) => (
                  <div key={d.date} className="promo-chart-bar-group" title={`${d.date}\nViews: ${d.views}\nCompletes: ${d.completes}\nDownloads: ${d.downloads}`}>
                    <div className="promo-chart-bars">
                      <div className="promo-chart-bar promo-chart-bar-views" style={{ height: `${(d.views / maxDaily) * 100}%` }} />
                      <div className="promo-chart-bar promo-chart-bar-completes" style={{ height: `${(d.completes / maxDaily) * 100}%` }} />
                      <div className="promo-chart-bar promo-chart-bar-downloads" style={{ height: `${(d.downloads / maxDaily) * 100}%` }} />
                    </div>
                    <span className="promo-chart-label">{d.date.split("-").slice(1).join("/")}</span>
                  </div>
                ))}
              </div>
              <div className="promo-chart-legend">
                <span><i className="promo-legend-dot promo-legend-views" /> Views</span>
                <span><i className="promo-legend-dot promo-legend-completes" /> Completes</span>
                <span><i className="promo-legend-dot promo-legend-downloads" /> Downloads</span>
              </div>
            </div>
          )}

          {/* Top links */}
          {data.topLinks.length > 0 && (
            <div className="promo-section">
              <h3 className="promo-section-title">Top Performing Links</h3>
              <div className="promo-table-wrap">
                <table className="promo-table">
                  <thead>
                    <tr><th>Resource</th><th>Views</th><th>Completes</th><th>Downloads</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {data.topLinks.map((l) => (
                      <tr key={l.linkId}>
                        <td className="promo-link-name">{l.resource_name}</td>
                        <td>{l.views}</td>
                        <td>{l.completes}</td>
                        <td>{l.downloads}</td>
                        <td>{l.views > 0 ? `${Math.round((l.downloads / l.views) * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Referrers */}
          {data.referrers.length > 0 && (
            <div className="promo-section">
              <h3 className="promo-section-title">Traffic Sources</h3>
              <div className="promo-table-wrap">
                <table className="promo-table">
                  <thead>
                    <tr><th>Referrer</th><th>Views</th></tr>
                  </thead>
                  <tbody>
                    {data.referrers.map((r, i) => (
                      <tr key={i}>
                        <td className="promo-link-name">{r.referer.length > 80 ? r.referer.slice(0, 80) + "..." : r.referer}</td>
                        <td>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
