"use client";

import { useState, useEffect } from "react";
import { BiIcon } from "./BiIcon";

type Popup = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  features: string[];
  ctaText: string | null;
  ctaUrl: string | null;
  active: boolean;
};

export function PromoPopupManageClient() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    featuresText: "",
    ctaText: "",
    ctaUrl: "",
    active: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPopups = async () => {
    try {
      const r = await fetch("/api/admin/promo-popups");
      const data = await r.ok ? r.json() : [];
      setPopups(Array.isArray(data) ? data : []);
    } catch {
      setPopups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const features = formData.featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
      const body = {
        title: formData.title,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        features,
        ctaText: formData.ctaText || null,
        ctaUrl: formData.ctaUrl || null,
        active: formData.active,
      };
      if (editingId) {
        const r = await fetch(`/api/admin/promo-popups/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json()).error || "Failed to update");
      } else {
        const r = await fetch("/api/admin/promo-popups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json()).error || "Failed to create");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: "", description: "", imageUrl: "", featuresText: "", ctaText: "", ctaUrl: "", active: false });
      fetchPopups();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p: Popup) => {
    setEditingId(p.id);
    setFormData({
      title: p.title,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      featuresText: p.features.join("\n"),
      ctaText: p.ctaText || "",
      ctaUrl: p.ctaUrl || "",
      active: p.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this promo popup?")) return;
    try {
      const r = await fetch(`/api/admin/promo-popups/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      fetchPopups();
    } catch {
      alert("Failed to delete.");
    }
  };

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Promo popup</h1>
      <p className="dashboard-description">
        Build a mid-screen popup to promote offers, features, or other content. Add title, description, image, features list, and a call-to-action button.
      </p>

      <div className="announcements-manage-header">
        <button
          type="button"
          className="dashboard-btn dashboard-btn-primary announcements-add-btn"
          onClick={() => {
            setEditingId(null);
            setFormData({ title: "", description: "", imageUrl: "", featuresText: "", ctaText: "", ctaUrl: "", active: false });
            setShowForm(true);
          }}
        >
          <BiIcon name="plus-lg" size={18} />
          Add promo popup
        </button>
      </div>

      {showForm && (
        <div className="protection-manage-modal">
          <div className="protection-manage-overlay" onClick={() => !submitting && (setShowForm(false), setEditingId(null))} />
          <div className="protection-manage-form-content">
            <div className="protection-manage-form-header">
              <h3>{editingId ? "Edit promo popup" : "Add promo popup"}</h3>
              <button type="button" onClick={() => !submitting && (setShowForm(false), setEditingId(null))}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                  placeholder="e.g. Get 20% off Premium"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Short description of the offer"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="dashboard-form-group">
                <label>Features (one per line)</label>
                <textarea
                  value={formData.featuresText}
                  onChange={(e) => setFormData((p) => ({ ...p, featuresText: e.target.value }))}
                  rows={4}
                  placeholder="Feature one&#10;Feature two&#10;..."
                />
              </div>
              <div className="dashboard-form-group">
                <label>Button text (CTA)</label>
                <input
                  type="text"
                  value={formData.ctaText}
                  onChange={(e) => setFormData((p) => ({ ...p, ctaText: e.target.value }))}
                  placeholder="e.g. Subscribe now"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Button link (CTA URL)</label>
                <input
                  type="url"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, ctaUrl: e.target.value }))}
                  placeholder="https://6ureleaks.com/membership"
                />
              </div>
              <div className="dashboard-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--discord-blurple)" }}
                  />
                  <span>Active (show popup to visitors)</span>
                </label>
              </div>
              <div className="protection-manage-form-actions">
                <button type="button" onClick={() => !submitting && (setShowForm(false), setEditingId(null))}>Cancel</button>
                <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="dashboard-empty">Loading...</p>
      ) : popups.length === 0 ? (
        <p className="dashboard-empty">
          No promo popups yet. Run the migration <code>scripts/migrations/add-promo-popups.sql</code> if you haven’t, then add one.
        </p>
      ) : (
        <div className="announcements-manage-list">
          {popups.map((p) => (
            <div key={p.id} className={`announcements-manage-item ${p.active ? "active" : ""}`}>
              <div className="announcements-manage-item-main">
                <div className="announcements-manage-item-text">
                  <strong className="announcements-manage-item-title">{p.title}</strong>
                  {p.description && <span className="announcements-manage-item-message">{p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}</span>}
                </div>
                <div className="announcements-manage-item-meta">
                  {p.active ? <span className="announcements-manage-badge active">Active</span> : <span className="announcements-manage-badge inactive">Inactive</span>}
                </div>
              </div>
              <div className="announcements-manage-item-actions">
                <button type="button" className="dashboard-btn-ghost dashboard-btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                <button type="button" className="dashboard-btn-danger dashboard-btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
