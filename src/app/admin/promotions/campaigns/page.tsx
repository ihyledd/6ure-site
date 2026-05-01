"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
  sponsor_enabled: boolean;
  sponsor_name: string | null;
  video_url: string;
  video_duration_secs: number;
  created_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/promotions/campaigns")
      .then((r) => r.json())
      .then((data) => { setCampaigns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/promotions/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c))
    );
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign? Download links will be unlinked.")) return;
    await fetch(`/api/promotions/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Ad Campaigns</h2>
          <p className="dash-subtitle">Manage video ad campaigns for download gates</p>
        </div>
        <Link href="/admin/promotions/campaigns/new" className="promo-action-btn promo-action-primary">
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <p className="promo-loading">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div className="promo-empty">
          <p>No campaigns yet.</p>
          <Link href="/admin/promotions/campaigns/new" className="promo-action-btn promo-action-primary">
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="promo-table-wrap">
          <table className="promo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sponsor</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/promotions/campaigns/${c.id}/edit`} className="promo-link-name">
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    {c.sponsor_enabled ? (
                      <span className="promo-badge promo-badge-active">{c.sponsor_name || "Enabled"}</span>
                    ) : (
                      <span className="promo-badge promo-badge-off">Disabled</span>
                    )}
                  </td>
                  <td>{c.video_duration_secs}s</td>
                  <td>
                    <button
                      className={`promo-toggle ${c.is_active ? "promo-toggle-on" : "promo-toggle-off"}`}
                      onClick={() => toggleActive(c.id, c.is_active)}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td>
                    <div className="promo-actions-cell">
                      <Link href={`/admin/promotions/campaigns/${c.id}/edit`} className="promo-action-sm">
                        Edit
                      </Link>
                      <button onClick={() => deleteCampaign(c.id)} className="promo-action-sm promo-action-danger">
                        Delete
                      </button>
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
