"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DownloadLink {
  id: string;
  slug: string;
  resource_name: string;
  ad_enabled: boolean;
  campaign_name: string | null;
  campaign_mode: string;
  total_views: number;
  total_completes: number;
  total_downloads: number;
  is_active: boolean;
  created_at: string;
}

export default function LinksPage() {
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promotions/links")
      .then((r) => r.json())
      .then((data) => { setLinks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleAd(id: string, current: boolean) {
    await fetch(`/api/promotions/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adEnabled: !current }),
    });
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ad_enabled: !current } : l)));
  }

  async function deleteLink(id: string) {
    if (!confirm("Delete this download link and all its analytics data?")) return;
    await fetch(`/api/promotions/links/${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function copyUrl(slug: string) {
    navigator.clipboard.writeText(`https://6ureleaks.com/download/${slug}`);
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Download Links</h2>
          <p className="dash-subtitle">Manage ad-gated download links</p>
        </div>
        <Link href="/dashboard/promotions/links/new" className="promo-action-btn promo-action-primary">
          + New Link
        </Link>
      </div>

      {loading ? (
        <p className="promo-loading">Loading links...</p>
      ) : links.length === 0 ? (
        <div className="promo-empty">
          <p>No download links yet.</p>
          <Link href="/dashboard/promotions/links/new" className="promo-action-btn promo-action-primary">
            Create your first download link
          </Link>
        </div>
      ) : (
        <div className="promo-table-wrap">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>URL</th>
                <th>Campaign</th>
                <th>Mode</th>
                <th>Ad Gate</th>
                <th>Views</th>
                <th>Downloads</th>
                <th>Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className={!l.is_active ? "promo-row-inactive" : undefined}>
                  <td>
                    <Link href={`/dashboard/promotions/links/${l.id}/edit`} className="promo-link-name">
                      {l.resource_name}
                    </Link>
                  </td>
                  <td>
                    <button className="promo-copy-btn" onClick={() => copyUrl(l.slug)} title="Copy URL">
                      <code className="promo-slug">/download/{l.slug}</code>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </td>
                  <td>{l.campaign_name || "—"}</td>
                  <td><span className="promo-badge promo-badge-mode">{l.campaign_mode}</span></td>
                  <td>
                    <button
                      className={`promo-toggle ${l.ad_enabled ? "promo-toggle-on" : "promo-toggle-off"}`}
                      onClick={() => toggleAd(l.id, l.ad_enabled)}
                    >
                      {l.ad_enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td>{l.total_views}</td>
                  <td>{l.total_downloads}</td>
                  <td>
                    {l.total_views > 0
                      ? `${Math.round((l.total_downloads / l.total_views) * 100)}%`
                      : "—"}
                  </td>
                  <td>
                    <div className="promo-actions-cell">
                      <Link href={`/dashboard/promotions/links/${l.id}/edit`} className="promo-action-sm">Edit</Link>
                      <button onClick={() => deleteLink(l.id)} className="promo-action-sm promo-action-danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
