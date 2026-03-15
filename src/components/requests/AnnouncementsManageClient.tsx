"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BiIcon } from "./BiIcon";

type Announcement = {
  id: number;
  title: string;
  message: string;
  active: boolean;
  centered: boolean;
  createdAt: Date | string;
  discountPercent?: number | null;
  endsAt?: string | null;
};

export function AnnouncementsManageClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    active: true,
    centered: false,
    discountPercent: "" as string | number,
    endsAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const r = await fetch("/api/announcements");
      if (!r.ok) return;
      const data = await r.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/announcements/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          ...formData,
          discountPercent: formData.discountPercent === "" ? null : Number(formData.discountPercent) || null,
          endsAt: formData.endsAt?.trim() || null,
        }),
        });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Failed to update");
        }
      } else {
        const r = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          ...formData,
          discountPercent: formData.discountPercent === "" ? null : Number(formData.discountPercent) || null,
          endsAt: formData.endsAt?.trim() || null,
        }),
        });
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Failed to create");
        }
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: "", message: "", active: true, centered: false, discountPercent: "", endsAt: "" });
      fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setFormData({
      title: a.title || "",
      message: a.message || "",
      active: Boolean(a.active),
      centered: Boolean(a.centered),
      discountPercent: a.discountPercent != null ? a.discountPercent : "",
      endsAt: a.endsAt || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const r = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to delete");
      }
      fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const handleToggleActive = async (a: Announcement) => {
    try {
      const r = await fetch(`/api/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          message: a.message,
          active: !a.active,
          centered: a.centered,
          discountPercent: a.discountPercent ?? null,
          endsAt: a.endsAt ?? null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to update");
      }
      fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Announcements</h1>
      <p className="dashboard-description">
        Create and edit announcements shown in the bar at the top of the requests page.
      </p>

      <div className="announcements-manage-header">
        <button
          type="button"
          className="dashboard-btn dashboard-btn-primary announcements-add-btn"
          onClick={() => {
            setEditingId(null);
            setFormData({ title: "", message: "", active: true, centered: false, discountPercent: "", endsAt: "" });
            setShowForm(true);
          }}
        >
          <BiIcon name="megaphone" size={18} />
          Add Announcement
        </button>
      </div>

      {showForm && (
        <div className="protection-manage-modal">
          <div className="protection-manage-overlay" onClick={() => !submitting && (setShowForm(false), setEditingId(null))} />
          <div className="protection-manage-form-content">
            <div className="protection-manage-form-header">
              <h3>{editingId ? "Edit Announcement" : "Add Announcement"}</h3>
              <button type="button" onClick={() => !submitting && (setShowForm(false), setEditingId(null))}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="dashboard-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Short title"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Message (Markdown supported: **bold**, *italic*, [links](url), lists, etc.)</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Full message text"
                />
              </div>
              <div className="dashboard-form-group">
                <label>Promote Premium (optional)</label>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 8px" }}>
                  Set a discount and end date to encourage subscriptions (e.g. &quot;Get 20% off&quot;, &quot;Ends on 1 April 2026&quot;).
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 120px" }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercent === "" ? "" : formData.discountPercent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discountPercent: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 }))}
                      placeholder="e.g. 20"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 160px" }}>
                    <label style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Ends on (date)</label>
                    <input
                      type="date"
                      value={formData.endsAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endsAt: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                  </div>
                </div>
              </div>
              <div className="dashboard-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--discord-blurple)" }}
                  />
                  <span>Active (show in announcement bar)</span>
                </label>
              </div>
              <div className="dashboard-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={formData.centered}
                    onChange={(e) => setFormData((prev) => ({ ...prev, centered: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--discord-blurple)" }}
                  />
                  <span>Center announcement for everyone</span>
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
        <p className="dashboard-empty">Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p className="dashboard-empty">
          No announcements yet. Add one to show in the bar at the top.
        </p>
      ) : (
        <div className="announcements-manage-list">
          {announcements.map((a) => (
            <div key={a.id} className={`announcements-manage-item ${a.active ? "active" : ""}`}>
              <div className="announcements-manage-item-main">
                <div className="announcements-manage-item-text">
                  <strong className="announcements-manage-item-title">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({ children }) => <>{children}</> }}>
                      {a.title || "Untitled"}
                    </ReactMarkdown>
                  </strong>
                  <span className="announcements-manage-item-message">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.message}</ReactMarkdown>
                  </span>
                </div>
                <div className="announcements-manage-item-meta">
                  {a.active ? (
                    <span className="announcements-manage-badge active">Active</span>
                  ) : (
                    <span className="announcements-manage-badge inactive">Inactive</span>
                  )}
                  {a.centered && <span className="announcements-manage-badge centered">Centered</span>}
                </div>
              </div>
              <div className="announcements-manage-item-actions">
                <button
                  type="button"
                  className="dashboard-btn-ghost dashboard-btn-sm"
                  onClick={() => handleToggleActive(a)}
                  title={a.active ? "Set inactive" : "Set active"}
                >
                  {a.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="dashboard-btn-ghost dashboard-btn-sm"
                  onClick={() => handleEdit(a)}
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-btn-danger dashboard-btn-sm"
                  onClick={() => handleDelete(a.id)}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
