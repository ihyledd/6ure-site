"use client";

import { useState } from "react";

type ResourceItem = {
  id: number;
  name: string;
  editor_name: string;
  category: string;
  is_premium: boolean | number;
  download_count: number;
  view_count?: number | null;
  leaked_at: string;
  thumbnail_url: string;
  description?: string | null;
  hidden?: boolean | number | null;
  is_protected?: boolean | number | null;
  is_featured?: boolean | number | null;
  status?: string | null;
  place_url?: string | null;
  editor_social_url?: string | null;
  price?: string | null;
  price_numeric?: number | null;
  file_size_bytes?: number | null;
  file_path?: string | null;
  tags?: string | null;
};

function formatBytes(b?: number | null): string {
  if (!b || b <= 0) return "—";
  if (b >= 1024 * 1024 * 1024) return (b / (1024 ** 3)).toFixed(1) + " GB";
  if (b >= 1024 * 1024) return (b / (1024 ** 2)).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
  return `${b} B`;
}

export function MyResourcesClient({ initialUploads }: { initialUploads: ResourceItem[] }) {
  const [uploads, setUploads] = useState<ResourceItem[]>(initialUploads);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");

  async function handleSaveEdit() {
    if (!editingResource) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/resources/${editingResource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingResource),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === editingResource.id ? editingResource : u));
        setEditingResource(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save changes");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving changes");
    } finally {
      setSaving(false);
    }
  }

  const filtered = uploads.filter(u => {
    if (filter === "free" && u.is_premium) return false;
    if (filter === "premium" && !u.is_premium) return false;
    if (search && !`${u.name} ${u.editor_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalDownloads = uploads.reduce((acc, u) => acc + (Number(u.download_count) || 0), 0);
  const totalViews = uploads.reduce((acc, u) => acc + (Number(u.view_count) || 0), 0);

  return (
    <div className="leaker-dashboard-resources">
      <div className="dash-header" style={{ marginBottom: 32 }}>
        <h1 className="dash-title">My Resources</h1>
        <p className="dash-subtitle">View and manage all your uploaded leaks</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <SmallStat label="Resources" value={uploads.length} icon="bi-collection" />
        <SmallStat label="Total Downloads" value={totalDownloads.toLocaleString()} icon="bi-download" />
        <SmallStat label="Total Views" value={totalViews.toLocaleString()} icon="bi-eye" />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search your resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
        />
        <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
          {(["all", "free", "premium"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                background: filter === f ? "var(--discord-blurple)" : "transparent",
                color: filter === f ? "#fff" : "#aaa",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Resource</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Category</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Downloads</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Views</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Size</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Date</th>
              <th style={{ padding: "16px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#666" }}>
                {uploads.length === 0 ? "You haven't uploaded any resources yet." : "No resources match your filter."}
              </td></tr>
            ) : filtered.map((leak) => {
              const isHidden = !!leak.hidden || leak.status === "Hidden";
              const isProtected = !!leak.is_protected;
              return (
                <tr key={leak.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: isHidden ? 0.55 : 1 }}>
                  <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 500, color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img src={leak.thumbnail_url || "/placeholder.png"} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} alt="" />
                      <span>{leak.name}</span>
                    </div>
                    {leak.is_premium ? <span style={{ marginLeft: 8, padding: "2px 6px", background: "rgba(250, 166, 26, 0.15)", color: "#faa61a", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>PREMIUM</span> : null}
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: 13, color: "#949cf7" }}>{leak.category}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#aaa", textAlign: "right" }}>{leak.download_count}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#aaa", textAlign: "right" }}>{leak.view_count ?? 0}</td>
                  <td style={{ padding: "16px 24px", fontSize: 13, color: "#aaa", textAlign: "right" }}>{formatBytes(leak.file_size_bytes)}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {isHidden && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(255,255,255,0.06)", color: "#888", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          <i className="bi bi-eye-slash" /> Hidden
                        </span>
                      )}
                      {isProtected && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(237, 66, 69, 0.12)", color: "#ed4245", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          <i className="bi bi-shield-lock" /> Protected
                        </span>
                      )}
                      {!isHidden && !isProtected && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "rgba(45, 199, 112, 0.1)", color: "#2dc770", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          <i className="bi bi-check-circle" /> Live
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", fontSize: 13, color: "#666" }}>{new Date(leak.leaked_at).toLocaleDateString()}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <button
                      onClick={() => setEditingResource(leak)}
                      className="dash-btn dash-btn-ghost"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={isProtected}
                      title={isProtected ? "Protected resources can only be edited by admins" : ""}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingResource && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#18191c", width: 560, maxHeight: "90vh", overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", padding: 0 }}>

            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#18191c", zIndex: 10 }}>
              <h2 style={{ fontSize: 18, margin: 0, color: "#fff", fontWeight: 700 }}>Edit Resource</h2>
              <button onClick={() => setEditingResource(null)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4 }}><i className="bi bi-x-lg" style={{ fontSize: 18 }} /></button>
            </div>

            <div style={{ padding: 24 }}>
              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>Resource Name</label>
                <input type="text" value={editingResource.name} onChange={e => setEditingResource({ ...editingResource, name: e.target.value })} />
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>Editor (Creator Name)</label>
                <input type="text" value={editingResource.editor_name} onChange={e => setEditingResource({ ...editingResource, editor_name: e.target.value })} />
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>Description</label>
                <textarea
                  placeholder="Enter resource description"
                  value={editingResource.description || ""}
                  onChange={e => setEditingResource({ ...editingResource, description: e.target.value })}
                  style={{ minHeight: 80 }}
                />
              </div>

              <div className="dashboard-form-row" style={{ marginBottom: 20 }}>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Thumbnail URL</label>
                  <input type="text" value={editingResource.thumbnail_url || ""} onChange={e => setEditingResource({ ...editingResource, thumbnail_url: e.target.value })} placeholder="Leave empty to keep current" />
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Product Link</label>
                  <input type="text" value={editingResource.place_url || ""} onChange={e => setEditingResource({ ...editingResource, place_url: e.target.value })} placeholder="https://payhip.com/..." />
                </div>
              </div>

              <div className="dashboard-form-row" style={{ marginBottom: 20 }}>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Price (display)</label>
                  <input type="text" value={editingResource.price || ""} onChange={e => setEditingResource({ ...editingResource, price: e.target.value })} placeholder="$9.99" />
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Price (EUR numeric)</label>
                  <input type="number" min={0} step="0.01" value={editingResource.price_numeric ?? ""} onChange={e => setEditingResource({ ...editingResource, price_numeric: e.target.value === "" ? null : Number(e.target.value) })} placeholder="9.50" />
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>File size (bytes)</label>
                  <input type="number" min={0} value={editingResource.file_size_bytes ?? ""} onChange={e => setEditingResource({ ...editingResource, file_size_bytes: e.target.value === "" ? null : Number(e.target.value) })} placeholder="0" />
                </div>
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>Editor Social URL</label>
                <input
                  type="text"
                  value={editingResource.editor_social_url || ""}
                  onChange={e => setEditingResource({ ...editingResource, editor_social_url: e.target.value })}
                  placeholder="https://tiktok.com/@... or https://youtube.com/@..."
                />
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>Tags</label>
                <input
                  type="text"
                  value={editingResource.tags || ""}
                  onChange={e => setEditingResource({ ...editingResource, tags: e.target.value })}
                  placeholder="comma,separated,tags"
                />
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label>File path <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>(read-only)</span></label>
                <input type="text" value={editingResource.file_path || ""} disabled style={{ opacity: 0.65, cursor: "not-allowed" }} />
              </div>

              <div className="dashboard-form-group">
                <label>Category</label>
                <select value={editingResource.category || ""} onChange={e => setEditingResource({ ...editingResource, category: e.target.value })}>
                  <option value="Adobe After Effects">Adobe After Effects</option>
                  <option value="Adobe Premiere Pro">Adobe Premiere Pro</option>
                  <option value="Adobe Photoshop">Adobe Photoshop</option>
                  <option value="Alight Motion">Alight Motion</option>
                  <option value="CapCut">CapCut</option>
                  <option value="Sony Vegas Pro">Sony Vegas Pro</option>
                  <option value="Davinci Resolve">Davinci Resolve</option>
                  <option value="Video Star">Video Star</option>
                  <option value="Topaz Labs">Topaz Labs</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 12, background: "rgba(0,0,0,0.2)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button className="dash-btn dash-btn-ghost" onClick={() => setEditingResource(null)} disabled={saving}>Cancel</button>
              <button className="dash-btn dash-btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SmallStat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <i className={`bi ${icon}`} style={{ color: "#5865f2", fontSize: 14 }} />
        <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{value}</div>
    </div>
  );
}
