"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    isActive: true,
    sponsorEnabled: true,
    sponsorName: "",
    sponsorTagline: "",
    sponsorLogoUrl: "",
    sponsorCtaText: "Visit Sponsor",
    sponsorCtaUrl: "",
    videoUrl: "",
    videoDurationSecs: 30,
    headlineTemplate: "Watch to Unlock {resourceName}",
    subheadline: "PRESENTED BY {sponsorName}",
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadVideo(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("video", file);
    const res = await fetch("/api/promotions/upload-video", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      set("videoUrl", data.url);
      setVideoPreview(data.url);
    } else {
      alert(data.error || "Upload failed");
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.videoUrl) {
      alert("Name and video are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/promotions/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/admin/promotions/campaigns");
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create campaign");
    }
    setSaving(false);
  }

  return (
    <>
      <div className="dash-header">
        <h2 className="dash-title">New Ad Campaign</h2>
        <p className="dash-subtitle">Create a video ad campaign for download gates</p>
      </div>

      <form onSubmit={handleSubmit} className="promo-form">
        {/* Basic Info */}
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Campaign Details</h3>
          <div className="promo-field">
            <label>Campaign Name *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. PayPerClip Spring 2026" required />
          </div>
          <div className="promo-field promo-field-toggle">
            <label>Active</label>
            <button type="button" className={`promo-toggle ${form.isActive ? "promo-toggle-on" : "promo-toggle-off"}`} onClick={() => set("isActive", !form.isActive)}>
              {form.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        {/* Video Upload */}
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Video Ad</h3>
          <div className="promo-field">
            <label>Video File *</label>
            <div className="promo-upload-zone" onClick={() => fileRef.current?.click()}>
              {uploading ? (
                <span className="promo-upload-text">Uploading...</span>
              ) : videoPreview ? (
                <video src={videoPreview} className="promo-video-preview" controls muted />
              ) : (
                <span className="promo-upload-text">Click or drag to upload video (MP4, WebM, MOV — max 100MB)</span>
              )}
              <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
            </div>
            {form.videoUrl && <p className="promo-field-hint">Uploaded: {form.videoUrl}</p>}
          </div>
          <div className="promo-field">
            <label>Required Watch Duration (seconds)</label>
            <input type="number" min={5} max={120} value={form.videoDurationSecs} onChange={(e) => set("videoDurationSecs", parseInt(e.target.value) || 30)} />
            <p className="promo-field-hint">Users must watch this many seconds before the download unlocks</p>
          </div>
        </div>

        {/* Sponsor Card */}
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
                <input type="text" value={form.sponsorName} onChange={(e) => set("sponsorName", e.target.value)} placeholder="e.g. GET PAID TO EDIT!" />
              </div>
              <div className="promo-field">
                <label>Sponsor Tagline</label>
                <input type="text" value={form.sponsorTagline} onChange={(e) => set("sponsorTagline", e.target.value)} placeholder="e.g. Turn your edits into real money!" />
              </div>
              <div className="promo-field">
                <label>Sponsor Logo URL</label>
                <input type="url" value={form.sponsorLogoUrl} onChange={(e) => set("sponsorLogoUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="promo-field-row">
                <div className="promo-field">
                  <label>CTA Button Text</label>
                  <input type="text" value={form.sponsorCtaText} onChange={(e) => set("sponsorCtaText", e.target.value)} placeholder="Visit Sponsor" />
                </div>
                <div className="promo-field">
                  <label>CTA Button URL</label>
                  <input type="url" value={form.sponsorCtaUrl} onChange={(e) => set("sponsorCtaUrl", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Customization */}
        <div className="promo-form-section">
          <h3 className="promo-form-section-title">Page Customization</h3>
          <div className="promo-field">
            <label>Headline Template</label>
            <input type="text" value={form.headlineTemplate} onChange={(e) => set("headlineTemplate", e.target.value)} placeholder="Watch to Unlock {resourceName}" />
            <p className="promo-field-hint">Use {"{resourceName}"} as a placeholder for the download name</p>
          </div>
          <div className="promo-field">
            <label>Subheadline</label>
            <input type="text" value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} placeholder="PRESENTED BY {sponsorName}" />
            <p className="promo-field-hint">Use {"{sponsorName}"} as a placeholder</p>
          </div>
        </div>

        <div className="promo-form-actions">
          <button type="button" onClick={() => router.back()} className="promo-action-btn">Cancel</button>
          <button type="submit" disabled={saving} className="promo-action-btn promo-action-primary">
            {saving ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>
    </>
  );
}
