"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DownloadLink {
  id: string;
  slug: string;
  resourceName: string;
  adEnabled: boolean;
  campaignName: string | null;
  campaignMode: string;
  totalViews: number;
  totalCompletes: number;
  totalDownloads: number;
  isActive: boolean;
  createdAt: string;
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
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, adEnabled: !current } : l)));
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
                <tr key={l.id} className={!l.isActive ? "promo-row-inactive" : undefined}>
                  <td>
                    <Link href={`/dashboard/promotions/links/${l.id}/edit`} className="promo-link-name">
                      {l.resourceName}
                    </Link>
                  </td>
                  <td>
                    <button className="promo-copy-btn" onClick={() => copyUrl(l.slug)} title="Copy URL">
                      <code className="promo-slug">/download/{l.slug}</code>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                  </td>
                  <td>{l.campaignName || "—"}</td>
                  <td><span className="promo-badge promo-badge-mode">{l.campaignMode}</span></td>
                  <td>
                    <button
                      className={`promo-toggle ${l.adEnabled ? "promo-toggle-on" : "promo-toggle-off"}`}
                      onClick={() => toggleAd(l.id, l.adEnabled)}
                    >
                      {l.adEnabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td>{l.totalViews}</td>
                  <td>{l.totalDownloads}</td>
                  <td>
                    {l.totalViews > 0
                      ? `${Math.round((l.totalDownloads / l.totalViews) * 100)}%`
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
