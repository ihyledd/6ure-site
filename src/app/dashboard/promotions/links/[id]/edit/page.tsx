"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface Campaign { id: string; name: string; isActive: boolean; }

export default function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    resourceName: "", slug: "", downloadUrl: "", adEnabled: true,
    campaignId: "", campaignMode: "specific" as string,
    thumbnailUrl: "", editorName: "", description: "",
    password: "", sftpgoPath: "", expiresAt: "", isActive: true,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/promotions/links/${id}`).then((r) => r.json()),
      fetch("/api/promotions/campaigns").then((r) => r.json()),
    ]).then(([link, camps]) => {
      setForm({
        resourceName: link.resourceName ?? "",
        slug: link.slug ?? "",
        downloadUrl: link.downloadUrl ?? "",
        adEnabled: Boolean(link.adEnabled),
        campaignId: link.campaignId ?? "",
        campaignMode: link.campaignMode ?? "specific",
        thumbnailUrl: link.thumbnailUrl ?? "",
        editorName: link.editorName ?? "",
        description: link.description ?? "",
        password: link.password ?? "",
        sftpgoPath: link.sftpgoPath ?? "",
        expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : "",
        isActive: Boolean(link.isActive),
      });
      setCampaigns(camps.filter((c: Campaign) => c.isActive));
      setLoading(false);
    });
  }, [id]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      campaignId: form.campaignId || null,
      expiresAt: form.expiresAt || null,
    };
    const res = await fetch(`/api/promotions/links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) router.push("/dashboard/promotions/links");
    else alert("Failed to save");
    setSaving(false);
  }

  if (loading) return <p className="promo-loading">Loading link...</p>;

  return (
    <>
      <div className="dash-header">
        <h2 className="dash-title">Edit Download Link</h2>
        <p className="dash-subtitle">{form.resourceName}</p>
      </div>

      <form onSubmit={handleSubmit} className="promo-form">
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Link Details</h3>
          <div className="promo-field promo-field-toggle">
            <label>Link Active</label>
            <button type="button" className={`promo-toggle ${form.isActive ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("isActive", !form.isActive)}>
              {form.isActive ? "Active" : "Inactive"}
            </button>
          </div>
          <div className="promo-field">
            <label>Resource Name</label>
            <input type="text" value={form.resourceName} onChange={(e) => set("resourceName", e.target.value)} required />
          </div>
          <div className="promo-field">
            <label>URL Slug</label>
            <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div className="promo-field">
            <label>Download URL</label>
            <input type="url" value={form.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} required />
          </div>
          <div className="promo-field">
            <label>SFTPGo File Path</label>
            <input type="text" value={form.sftpgoPath} onChange={(e) => set("sftpgoPath", e.target.value)} />
          </div>
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Ad Gate</h3>
          <div className="promo-field promo-field-toggle">
            <label>Ad Gate</label>
            <button type="button" className={`promo-toggle ${form.adEnabled ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("adEnabled", !form.adEnabled)}>
              {form.adEnabled ? "ON" : "OFF"}
            </button>
          </div>
          {form.adEnabled && (
            <>
              <div className="promo-field">
                <label>Campaign Mode</label>
                <select value={form.campaignMode} onChange={(e) => set("campaignMode", e.target.value)}>
                  <option value="specific">Specific campaign</option>
                  <option value="random">Random</option>
                  <option value="all">Show all</option>
                </select>
              </div>
              {form.campaignMode === "specific" && (
                <div className="promo-field">
                  <label>Campaign</label>
                  <select value={form.campaignId} onChange={(e) => set("campaignId", e.target.value)}>
                    <option value="">Select...</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Metadata</h3>
          <div className="promo-field-row">
            <div className="promo-field">
              <label>Editor Name</label>
              <input type="text" value={form.editorName} onChange={(e) => set("editorName", e.target.value)} />
            </div>
            <div className="promo-field">
              <label>Thumbnail URL</label>
              <input type="url" value={form.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)} />
            </div>
          </div>
          <div className="promo-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>
          <div className="promo-field-row">
            <div className="promo-field">
              <label>Password</label>
              <input type="text" value={form.password} onChange={(e) => set("password", e.target.value)} />
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
