"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

export default function NewLinkPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    resourceName: "",
    slug: "",
    downloadUrl: "",
    adEnabled: true,
    campaignId: "",
    campaignMode: "specific" as "specific" | "random" | "all",
    thumbnailUrl: "",
    editorName: "",
    description: "",
    password: "",
    sftpgoPath: "",
    expiresAt: "",
  });

  useEffect(() => {
    fetch("/api/promotions/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.filter((c: Campaign) => c.is_active)));
  }, []);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.resourceName || !form.downloadUrl) {
      alert("Resource name and download URL are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      slug: form.slug || autoSlug(form.resourceName),
      campaignId: form.campaignId || null,
      expiresAt: form.expiresAt || null,
    };
    const res = await fetch("/api/promotions/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push("/admin/promotions/links");
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create link");
    }
    setSaving(false);
  }

  return (
    <>
      <div className="dash-header">
        <h2 className="dash-title">New Download Link</h2>
        <p className="dash-subtitle">Create an ad-gated download link for sharing</p>
      </div>

      <form onSubmit={handleSubmit} className="promo-form">
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Link Details</h3>
          <div className="promo-field">
            <label>Resource Name *</label>
            <input
              type="text"
              value={form.resourceName}
              onChange={(e) => { set("resourceName", e.target.value); if (!form.slug) set("slug", autoSlug(e.target.value)); }}
              placeholder="e.g. ULTIMATE PRESET PACK v3"
              required
            />
          </div>
          <div className="promo-field">
            <label>URL Slug</label>
            <div className="promo-slug-preview">
              <span className="promo-slug-prefix">6ureleaks.com/download/</span>
              <input type="text" value={form.slug || autoSlug(form.resourceName)} onChange={(e) => set("slug", e.target.value)} />
            </div>
          </div>
          <div className="promo-field">
            <label>Download URL *</label>
            <input
              type="url"
              value={form.downloadUrl}
              onChange={(e) => set("downloadUrl", e.target.value)}
              placeholder="https://files.6ureleaks.com/... or any direct download URL"
              required
            />
            <p className="promo-field-hint">The actual file URL users get after watching the ad</p>
          </div>
          <div className="promo-field">
            <label>SFTPGo File Path (optional)</label>
            <input
              type="text"
              value={form.sftpgoPath}
              onChange={(e) => set("sftpgoPath", e.target.value)}
              placeholder="/leaks/presets/pack-v3.zip"
            />
            <p className="promo-field-hint">If set, a new SFTPGo share will be auto-generated on each download</p>
          </div>
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Ad Gate Settings</h3>
          <div className="promo-field promo-field-toggle">
            <label>Ad Gate Enabled</label>
            <button type="button" className={`promo-toggle ${form.adEnabled ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("adEnabled", !form.adEnabled)}>
              {form.adEnabled ? "ON — users must watch ad" : "OFF — direct download"}
            </button>
          </div>
          {form.adEnabled && (
            <>
              <div className="promo-field">
                <label>Campaign Mode</label>
                <select value={form.campaignMode} onChange={(e) => set("campaignMode", e.target.value)}>
                  <option value="specific">Specific campaign</option>
                  <option value="random">Random (pick one each visit)</option>
                  <option value="all">Show all campaigns</option>
                </select>
                <p className="promo-field-hint">
                  {form.campaignMode === "specific" && "Show one specific campaign every time"}
                  {form.campaignMode === "random" && "Randomly pick a different campaign each visit"}
                  {form.campaignMode === "all" && "Show all active campaigns stacked together"}
                </p>
              </div>
              {form.campaignMode === "specific" && (
                <div className="promo-field">
                  <label>Campaign</label>
                  <select value={form.campaignId} onChange={(e) => set("campaignId", e.target.value)}>
                    <option value="">Select a campaign...</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Optional Metadata</h3>
          <div className="promo-field-row">
            <div className="promo-field">
              <label>Editor / Creator Name</label>
              <input type="text" value={form.editorName} onChange={(e) => set("editorName", e.target.value)} placeholder="6ure" />
            </div>
            <div className="promo-field">
              <label>Thumbnail URL</label>
              <input type="url" value={form.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="promo-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Optional description shown on the download page" />
          </div>
          <div className="promo-field-row">
            <div className="promo-field">
              <label>Password (optional)</label>
              <input type="text" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Leave empty for no password" />
            </div>
            <div className="promo-field">
              <label>Expires At</label>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="promo-form-actions">
          <button type="button" onClick={() => router.back()} className="promo-action-btn">Cancel</button>
          <button type="submit" disabled={saving} className="promo-action-btn promo-action-primary">
            {saving ? "Creating..." : "Create Download Link"}
          </button>
        </div>
      </form>
    </>
  );
}
