"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    isActive: true,
    sponsorEnabled: true,
    sponsorName: "",
    sponsorTagline: "",
    sponsorLogoUrl: "",
    sponsorCtaText: "",
    sponsorCtaUrl: "",
    videoUrl: "",
    videoDurationSecs: 30,
    headlineTemplate: "",
    subheadline: "",
  });

  useEffect(() => {
    fetch(`/api/promotions/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          isActive: Boolean(data.is_active),
          sponsorEnabled: Boolean(data.sponsor_enabled),
          sponsorName: data.sponsor_name ?? "",
          sponsorTagline: data.sponsor_tagline ?? "",
          sponsorLogoUrl: data.sponsor_logo_url ?? "",
          sponsorCtaText: data.sponsor_cta_text ?? "",
          sponsorCtaUrl: data.sponsor_cta_url ?? "",
          videoUrl: data.video_url ?? "",
          videoDurationSecs: data.video_duration_secs ?? 30,
          headlineTemplate: data.headline_template ?? "",
          subheadline: data.subheadline ?? "",
        });
        setLoading(false);
      });
  }, [id]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadVideo(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("video", file);
    const res = await fetch("/api/promotions/upload-video", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) set("videoUrl", data.url);
    else alert(data.error || "Upload failed");
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/promotions/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/admin/promotions/campaigns");
    else alert("Failed to save");
    setSaving(false);
  }

  if (loading) return <p className="promo-loading">Loading campaign...</p>;

  return (
    <>
      <div className="dash-header">
        <h2 className="dash-title">Edit Campaign</h2>
        <p className="dash-subtitle">{form.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="promo-form">
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Campaign Details</h3>
          <div className="promo-field">
            <label>Campaign Name *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="promo-field promo-field-toggle">
            <label>Active</label>
            <button type="button" className={`promo-toggle ${form.isActive ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("isActive", !form.isActive)}>
              {form.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Video Ad</h3>
          <div className="promo-field">
            <label>Video</label>
            <div className="promo-upload-zone" onClick={() => fileRef.current?.click()}>
              {uploading ? (
                <span className="promo-upload-text">Uploading...</span>
              ) : form.videoUrl ? (
                <video src={form.videoUrl} className="promo-video-preview" controls muted />
              ) : (
                <span className="promo-upload-text">Click to upload video</span>
              )}
              <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
            </div>
          </div>
          <div className="promo-field">
            <label>Required Watch Duration (seconds)</label>
            <input type="number" min={5} max={120} value={form.videoDurationSecs} onChange={(e) => set("videoDurationSecs", parseInt(e.target.value) || 30)} />
          </div>
        </div>

        <div className="promo-form-section">
          <div className="promo-form-section-header">
            <h3 className="promo-form-section-title">Sponsor Card</h3>
            <button type="button" className={`promo-toggle ${form.sponsorEnabled ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("sponsorEnabled", !form.sponsorEnabled)}>
              {form.sponsorEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          {form.sponsorEnabled && (
            <>
              <div className="promo-field">
                <label>Sponsor Name</label>
                <input type="text" value={form.sponsorName} onChange={(e) => set("sponsorName", e.target.value)} />
              </div>
              <div className="promo-field">
                <label>Sponsor Tagline</label>
                <input type="text" value={form.sponsorTagline} onChange={(e) => set("sponsorTagline", e.target.value)} />
              </div>
              <div className="promo-field">
                <label>Sponsor Logo URL</label>
                <input type="url" value={form.sponsorLogoUrl} onChange={(e) => set("sponsorLogoUrl", e.target.value)} />
              </div>
              <div className="promo-field-row">
                <div className="promo-field">
                  <label>CTA Button Text</label>
                  <input type="text" value={form.sponsorCtaText} onChange={(e) => set("sponsorCtaText", e.target.value)} />
                </div>
                <div className="promo-field">
                  <label>CTA Button URL</label>
                  <input type="url" value={form.sponsorCtaUrl} onChange={(e) => set("sponsorCtaUrl", e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Page Customization</h3>
          <div className="promo-field">
            <label>Headline Template</label>
            <input type="text" value={form.headlineTemplate} onChange={(e) => set("headlineTemplate", e.target.value)} />
          </div>
          <div className="promo-field">
            <label>Subheadline</label>
            <input type="text" value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
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
