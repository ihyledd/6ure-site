"use client";

import { useEffect, useState } from "react";

type ContentData = {
  hero_headline: string;
  hero_description: string;
  about_story: string;
  about_mission: string;
  about_vision: string;
  stat_downloads: number;
  stat_presets: number;
  stat_support_label: string;
};

const DEFAULTS: ContentData = {
  hero_headline: "Welcome to 6ure",
  hero_description: "",
  about_story: "",
  about_mission: "",
  about_vision: "",
  stat_downloads: 1000000,
  stat_presets: 5000,
  stat_support_label: "24/7",
};

export default function AdminContentPage() {
  const [data, setData] = useState<ContentData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/admin/about/content", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/about/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Save failed");
      setToast({ msg: "Content saved.", type: "success" });
    } catch {
      setToast({ msg: "Failed to save.", type: "error" });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key: keyof ContentData, value: string | number) =>
    setData((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div style={{ padding: 24, color: "var(--text-tertiary)" }}>Loading…</div>;

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Site Content</h2>
        <p>Edit the about page hero section, story text, and homepage stats.</p>
      </div>

      {toast && <div className={`dashboard-toast dashboard-toast-${toast.type}`}>{toast.msg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Hero Section</h3>
          <div className="dashboard-form-group">
            <label>Hero headline</label>
            <input value={data.hero_headline} onChange={(e) => set("hero_headline", e.target.value)} />
          </div>
          <div className="dashboard-form-group">
            <label>Hero description</label>
            <input value={data.hero_description} onChange={(e) => set("hero_description", e.target.value)} />
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title">About Section</h3>
          <div className="dashboard-form-group">
            <label>About story</label>
            <textarea rows={4} value={data.about_story} onChange={(e) => set("about_story", e.target.value)} />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>About mission</label>
              <input value={data.about_mission} onChange={(e) => set("about_mission", e.target.value)} />
            </div>
            <div className="dashboard-form-group">
              <label>About vision</label>
              <input value={data.about_vision} onChange={(e) => set("about_vision", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Homepage Stats</h3>
          <p className="dashboard-card-desc">Numbers shown on the about page. Downloads and Presets use a count-up animation.</p>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Downloads (number)</label>
              <input type="number" min="0" value={data.stat_downloads} onChange={(e) => set("stat_downloads", parseInt(e.target.value) || 0)} />
            </div>
            <div className="dashboard-form-group">
              <label>Presets (number)</label>
              <input type="number" min="0" value={data.stat_presets} onChange={(e) => set("stat_presets", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Support label (e.g. 24/7)</label>
            <input value={data.stat_support_label} onChange={(e) => set("stat_support_label", e.target.value)} style={{ maxWidth: 200 }} />
          </div>
        </div>

        <button type="submit" className="dashboard-btn dashboard-btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save content"}
        </button>
      </form>
    </div>
  );
}
