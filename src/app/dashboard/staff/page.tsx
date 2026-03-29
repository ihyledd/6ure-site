"use client";

import { useEffect, useState } from "react";

type StaffSocials = Partial<Record<string, string>>;

type StaffMember = {
  id: string;
  name: string;
  username?: string;
  role: string;
  avatar: string;
  description?: string;
  display: boolean;
  order: number;
  socials?: StaffSocials;
};

const ROLE_OPTIONS = ["Founder", "Co-Founder", "Developer", "Manager", "Exec Mod", "Moderator"];

const SOCIAL_OPTIONS = [
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@username" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channel" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/username" },
  { key: "twitch", label: "Twitch", placeholder: "https://twitch.tv/username" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
] as const;

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", role: "", order: 0, display: true, socials: {} as StaffSocials });

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOrder, setNewOrder] = useState(0);
  const [newDisplay, setNewDisplay] = useState(true);
  const [newSocials, setNewSocials] = useState<StaffSocials>({});

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = () =>
    fetch("/api/admin/about/staff")
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newRole.trim()) return;
    const res = await fetch("/api/admin/about/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        userId: newUserId.trim(),
        role: newRole.trim(),
        description: newDescription.trim(),
        order: newOrder,
        display: newDisplay,
        socials: cleanSocials(newSocials),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      showToast("Staff added.", "success");
      setNewUserId("");
      setNewRole("");
      setNewDescription("");
      setNewOrder(0);
      setNewDisplay(true);
      setNewSocials({});
      reload();
    } else showToast(data?.error ?? "Failed to add.", "error");
  };

  const deleteStaff = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    const res = await fetch("/api/admin/about/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) {
      showToast("Staff removed.", "success");
      setEditingId(null);
      reload();
    } else showToast("Failed to remove.", "error");
  };

  function cleanSocials(s: StaffSocials): StaffSocials {
    const out: StaffSocials = {};
    for (const { key } of SOCIAL_OPTIONS) {
      const v = s[key];
      if (typeof v === "string" && v.trim()) out[key] = v.trim();
    }
    return out;
  }

  const startEdit = (s: StaffMember) => {
    setEditingId(s.id);
    const socials: StaffSocials = {};
    for (const { key } of SOCIAL_OPTIONS) {
      const v = s.socials?.[key];
      if (typeof v === "string") socials[key] = v;
    }
    setEditForm({
      description: s.description ?? "",
      role: s.role ?? "",
      order: s.order ?? 0,
      display: s.display ?? true,
      socials,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await fetch("/api/admin/about/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "edit",
        id: editingId,
        description: editForm.description.trim() || undefined,
        role: editForm.role.trim(),
        order: editForm.order,
        display: editForm.display,
        socials: cleanSocials(editForm.socials),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      showToast("Saved.", "success");
      setEditingId(null);
      reload();
    } else showToast(data?.error ?? "Failed to save.", "error");
  };

  const toggleVisible = async (s: StaffMember) => {
    const res = await fetch("/api/admin/about/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", id: s.id, display: !s.display }),
    });
    if (res.ok) {
      showToast(s.display ? "Hidden from site." : "Visible on site.", "success");
      reload();
    } else showToast("Failed to update.", "error");
  };

  const moveStaff = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= staff.length) return;
    const reordered = [...staff];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, removed);
    const orderedIds = reordered.map((s) => s.id);
    const res = await fetch("/api/admin/about/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", orderedIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      showToast("Order updated.", "success");
      reload();
    } else showToast(data?.error ?? "Failed to reorder.", "error");
  };

  if (loading) return <div style={{ padding: 24, color: "var(--text-tertiary)" }}>Loading…</div>;

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Staff</h2>
        <p>Manage team members displayed on the about page. Edit order, role, and about yourself.</p>
      </div>

      {toast && <div className={`dashboard-toast dashboard-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="dashboard-card">
        <h3 className="dashboard-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Add new staff
        </h3>
        <form onSubmit={addStaff}>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Discord User ID</label>
              <input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="1234567890123456789" required />
            </div>
            <div className="dashboard-form-group">
              <label>Role (comma-separated for multiple)</label>
              <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="e.g. Founder, Co-Founder, Developer" required />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>About me / Description (optional)</label>
            <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short bio or about me" rows={3} />
          </div>
          <div className="dashboard-form-group">
            <label>Social links (optional)</label>
            <p className="dashboard-form-hint">Add profile URLs to show on your card. Leave blank to omit.</p>
            <div className="dashboard-socials-fields">
              {SOCIAL_OPTIONS.map((opt) => (
                <div key={opt.key} className="dashboard-form-row dashboard-form-row-sm">
                  <label className="dashboard-social-label">{opt.label}</label>
                  <input
                    type="url"
                    value={newSocials[opt.key] ?? ""}
                    onChange={(e) => setNewSocials((prev) => ({ ...prev, [opt.key]: e.target.value }))}
                    placeholder={opt.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Order</label>
              <input type="number" value={newOrder} onChange={(e) => setNewOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="dashboard-form-group dashboard-form-group-toggle-wrap">
              <label className="dashboard-toggle-label">
                <input type="checkbox" checked={newDisplay} onChange={(e) => setNewDisplay(e.target.checked)} className="dashboard-toggle-input" />
                <span className="dashboard-toggle-track" />
                <span>Display on site</span>
              </label>
            </div>
          </div>
          <button type="submit" className="dashboard-btn dashboard-btn-primary">
            Add staff
          </button>
        </form>
      </div>

      <div className="dashboard-card">
        <h3 className="dashboard-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Current staff ({staff.length})
        </h3>
        {staff.map((s, index) => (
          <div key={s.id} className="dashboard-list-item">
            {editingId === s.id ? (
              <div className="dashboard-staff-edit-form">
                <p className="dashboard-staff-edit-heading">Editing: {s.name}</p>
                <div className="dashboard-form-group">
                  <label>About yourself</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short bio"
                    rows={3}
                  />
                </div>
                <div className="dashboard-form-row">
                  <div className="dashboard-form-group">
                    <label>Role (comma-separated)</label>
                    <input
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      placeholder="Founder, Co-Founder, Developer"
                      list="staff-role-list"
                    />
                    <datalist id="staff-role-list">
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>
                  <div className="dashboard-form-group">
                    <label>Order</label>
                    <input
                      type="number"
                      value={editForm.order}
                      onChange={(e) => setEditForm((f) => ({ ...f, order: parseInt(e.target.value, 10) || 0 }))}
                    />
                  </div>
                </div>
                <div className="dashboard-form-group">
                  <label>Social links</label>
                  <div className="dashboard-socials-fields">
                    {SOCIAL_OPTIONS.map((opt) => (
                      <div key={opt.key} className="dashboard-form-row dashboard-form-row-sm">
                        <label className="dashboard-social-label">{opt.label}</label>
                        <input
                          type="url"
                          value={editForm.socials[opt.key] ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              socials: { ...f.socials, [opt.key]: e.target.value },
                            }))
                          }
                          placeholder={opt.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dashboard-form-group dashboard-form-group-toggle-wrap">
                  <label className="dashboard-toggle-label">
                    <input
                      type="checkbox"
                      checked={editForm.display}
                      onChange={(e) => setEditForm((f) => ({ ...f, display: e.target.checked }))}
                      className="dashboard-toggle-input"
                    />
                    <span className="dashboard-toggle-track" />
                    <span>Visible on site</span>
                  </label>
                </div>
                <div className="dashboard-staff-edit-actions">
                  <button type="button" className="dashboard-btn dashboard-btn-primary dashboard-btn-sm" onClick={saveEdit}>
                    Save
                  </button>
                  <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="dashboard-staff-reorder">
                  <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-icon" onClick={() => moveStaff(index, -1)} disabled={index === 0} title="Move up" aria-label="Move up">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-icon" onClick={() => moveStaff(index, 1)} disabled={index === staff.length - 1} title="Move down" aria-label="Move down">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
                {s.avatar ? (
                  <img src={s.avatar} alt="" className="dashboard-list-avatar" />
                ) : (
                  <span className="dashboard-list-avatar dashboard-list-avatar-initial">{(s.name ?? "?")[0].toUpperCase()}</span>
                )}
                <div className="dashboard-list-info">
                  <strong>{s.name}</strong>
                  <span>{s.role}</span>
                  {s.description && <span className="dashboard-list-desc">{s.description}</span>}
                </div>
                <button
                  type="button"
                  className={`dashboard-btn dashboard-btn-sm ${s.display ? "dashboard-badge-green" : "dashboard-badge-muted"}`}
                  style={{ marginRight: 8, cursor: "pointer" }}
                  onClick={() => toggleVisible(s)}
                  title={s.display ? "Hide from site" : "Show on site"}
                >
                  {s.display ? "Visible" : "Hidden"}
                </button>
                <div className="dashboard-list-actions">
                  <button type="button" className="dashboard-btn dashboard-btn-sm" onClick={() => startEdit(s)}>
                    Edit
                  </button>
                  <button type="button" className="dashboard-btn dashboard-btn-danger dashboard-btn-sm" onClick={() => deleteStaff(s.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {staff.length === 0 && <p className="dashboard-empty">No staff members yet.</p>}
      </div>
    </div>
  );
}
