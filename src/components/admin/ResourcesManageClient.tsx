"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/requests/UserAvatar";

type ResourceItem = {
  id: number;
  name: string;
  editor_name: string;
  category: string;
  is_premium: boolean;
  download_count: number;
  view_count?: number;
  leaked_at: string;
  editor_social_url: string | null;
  discord_member_id: string | null;
  discord_member_name: string | null;
  discord_member_avatar: string | null;
  file_path: string | null;
  thumbnail_url: string;
  description?: string;
  status?: string;
  hidden?: boolean | number;
  is_protected?: boolean | number;
  is_featured?: boolean;
  counts_for_payout?: boolean;
  place_url: string | null;
  price?: string | null;
  price_numeric?: number | null;
  file_size_bytes?: number | null;
};

export function ResourcesManageClient() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [limit] = useState(50);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [performingBulk, setPerformingBulk] = useState(false);

  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => {
    fetchResources();
  }, [search, statusFilter, categoryFilter, premiumFilter, pagination.page]);

  // Support ?highlight=<id>: fetch that single resource, open the edit modal,
  // and briefly outline the matching row.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("highlight");
    const id = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(id)) {
      setHighlightId(id);
      // Open edit modal as soon as we have row data; fetch directly so it works
      // even if the row is on another page.
      (async () => {
        try {
          const res = await fetch(`/api/resources?search=&page=1&limit=1&includeHidden=1&id=${id}`);
          // Fall back to the public resource endpoint if the admin search doesn't accept id directly.
          const single = await fetch(`/api/resources/${id}`);
          if (single.ok) {
            const data = await single.json();
            if (data?.item) setEditingResource(data.item as ResourceItem);
          } else if (res.ok) {
            const list = await res.json();
            const match = (list?.items || []).find((r: ResourceItem) => r.id === id);
            if (match) setEditingResource(match);
          }
        } catch (e) {
          console.warn("[Admin] highlight prefetch failed:", e);
        }
        // Auto-clear highlight after 4 s.
        setTimeout(() => setHighlightId(null), 4000);
      })();
    }
  }, []);

  async function fetchResources() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (premiumFilter !== "all") params.set("premium", premiumFilter === "premium" ? "1" : "0");
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("includeHidden", "1");
      params.set("page", String(pagination.page));
      params.set("limit", String(limit));
      
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      if (data.items) setResources(data.items);
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
      fetchResources();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleHidden(id: number, hidden: boolean) {
    try {
      await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      fetchResources();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleProtected(id: number, isProtected: boolean) {
    try {
      await fetch(`/api/admin/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_protected: isProtected }),
      });
      fetchResources();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveEdit() {
    if (!editingResource) return;
    try {
      const res = await fetch(`/api/admin/resources/${editingResource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingResource),
      });
      if (res.ok) {
        setEditingResource(null);
        fetchResources();
      } else {
        alert("Failed to save changes");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving changes");
    }
  }

  async function handleBulkAction(action: string, data?: any) {
    if (selectedIds.length === 0) return;
    if (action === "delete" && !confirm(`Are you sure you want to delete ${selectedIds.length} resources?`)) return;
    
    setPerformingBulk(true);
    try {
      const res = await fetch("/api/admin/resources/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds, data }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchResources();
      } else {
        alert("Bulk action failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPerformingBulk(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === resources.length) setSelectedIds([]);
    else setSelectedIds(resources.map(r => r.id));
  }


  return (
    <div className="admin-resources-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Resource Management</h1>
          <p className="dash-subtitle">Manage and monitor uploaded resources</p>
        </div>
      </div>

      <div className="dash-filters-card" style={{ marginBottom: 24, padding: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 6 }}>Search</label>
            <div className="search-input-wrap">
              <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
              <input
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none" }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 6 }}>Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", appearance: "none" }}>
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Hidden">Hidden</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 6 }}>Category</label>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", appearance: "none" }}>
              <option value="all">All Categories</option>
              <option value="Adobe After Effects">Adobe After Effects</option>
              <option value="Adobe Premiere Pro">Adobe Premiere Pro</option>
              <option value="Adobe Photoshop">Adobe Photoshop</option>
              <option value="Alight Motion">Alight Motion</option>
              <option value="CapCut">CapCut</option>
              <option value="Sony Vegas Pro">Sony Vegas Pro</option>
              <option value="Davinci Resolve">Davinci Resolve</option>
              <option value="Video Star">Video Star</option>
              <option value="Topaz Labs">Topaz Labs</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 6 }}>Premium</label>
            <select value={premiumFilter} onChange={(e) => { setPremiumFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", appearance: "none" }}>
              <option value="all">All Resources</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>

        </div>
      </div>

      <div className="dashboard-requests-table-wrap">
        <table className="dashboard-requests-table">
          <thead>
            <tr>
              <th style={{ width: 40, padding: "12px 16px" }}>
                <input type="checkbox" checked={resources.length > 0 && selectedIds.length === resources.length} onChange={toggleSelectAll} style={{ width: 16, height: 16, cursor: "pointer" }} />
              </th>
              <th>RESOURCE</th>
              <th>UPLOADER</th>
              <th>PATH</th>
              <th>STATUS</th>
              <th>STATS</th>
              <th>CREATED</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40 }}>Loading...</td></tr>
            ) : resources.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#888" }}>No resources found.</td></tr>
            ) : resources.map(res => (
              <tr key={res.id} className={selectedIds.includes(res.id) ? "selected-row" : ""} style={
                highlightId === res.id
                  ? { background: "rgba(88, 101, 242, 0.18)", outline: "2px solid var(--discord-blurple)" }
                  : selectedIds.includes(res.id)
                    ? { background: "rgba(88, 101, 242, 0.05)" }
                    : {}
              }>
                <td style={{ padding: "12px 16px" }}>
                  <input type="checkbox" checked={selectedIds.includes(res.id)} onChange={() => toggleSelect(res.id)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={res.thumbnail_url || "/placeholder.png"} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{res.name}</div>
                      <div style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", background: "rgba(88,101,242,0.15)", color: "#949cf7", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        {res.category?.toLowerCase().replace(/ /g, "-")}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <UserAvatar userId={res.discord_member_id} avatar={res.discord_member_avatar} displayName={res.discord_member_name} size={28} />
                    <div>
                      <div style={{ fontSize: 13, color: "#eee", fontWeight: 600 }}>{res.discord_member_name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{res.discord_member_id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: "#888" }} title={res.file_path || ""}>
                    {res.file_path || "—"}
                  </div>
                </td>
                <td>
                  {(() => {
                    const isHidden = !!res.hidden || res.status === "Hidden";
                    const isProtected = !!res.is_protected;
                    const status = (res.status || "Completed").toString();
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        {isHidden ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(255,255,255,0.06)", color: "#888", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            <i className="bi bi-eye-slash" /> HIDDEN
                          </span>
                        ) : status === "Processing" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(250, 166, 26, 0.1)", color: "#faa61a", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            <i className="bi bi-hourglass-split" /> PROCESSING
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(45, 199, 112, 0.1)", color: "#2dc770", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            <i className="bi bi-check-circle" /> COMPLETED
                          </span>
                        )}
                        {isProtected && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(237, 66, 69, 0.12)", color: "#ed4245", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            <i className="bi bi-shield-lock" /> PROTECTED
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td>
                  <div style={{ fontSize: 12, color: "#aaa", display: "flex", flexDirection: "column", gap: 2 }}>
                    <span><i className="bi bi-download" /> {res.download_count}</span>
                    <span><i className="bi bi-eye" /> {res.view_count ?? 0}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13, color: "#aaa" }}>
                  {new Date(res.leaked_at).toLocaleDateString()}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link href={`/resources/${res.id}`} target="_blank" className="dash-icon-btn" style={{ color: "#949cf7" }} title="View">
                      <i className="bi bi-eye" />
                    </Link>
                    <button
                      className="dash-icon-btn"
                      style={{ color: res.hidden ? "#fbbf24" : "#888" }}
                      title={res.hidden ? "Unhide" : "Hide"}
                      onClick={() => handleToggleHidden(res.id, !res.hidden)}
                    >
                      <i className={`bi ${res.hidden ? "bi-eye" : "bi-eye-slash"}`} />
                    </button>
                    <button
                      className="dash-icon-btn"
                      style={{ color: res.is_protected ? "#ed4245" : "#888" }}
                      title={res.is_protected ? "Remove protection" : "Mark protected"}
                      onClick={() => handleToggleProtected(res.id, !res.is_protected)}
                    >
                      <i className="bi bi-shield-lock" />
                    </button>
                    <button className="dash-icon-btn" style={{ color: "#5865f2" }} onClick={() => setEditingResource(res)} title="Edit">
                      <i className="bi bi-pencil-square" />
                    </button>
                    <button className="dash-icon-btn" style={{ color: "#ed4245" }} onClick={() => handleDelete(res.id)} title="Delete">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, padding: "0 8px" }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Showing <strong>{resources.length}</strong> of <strong>{pagination.total}</strong> resources
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="dash-btn dash-btn-ghost" 
            disabled={pagination.page <= 1 || loading}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            style={{ padding: "8px 16px" }}
          >
            Previous
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", fontSize: 14, color: "#fff", fontWeight: 500 }}>
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <button 
            className="dash-btn dash-btn-ghost" 
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            style={{ padding: "8px 16px" }}
          >
            Next
          </button>
        </div>
      </div>

      
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "#18191c", border: "1px solid var(--discord-blurple)", borderRadius: 16, padding: "16px 24px", display: "flex", alignItems: "center", gap: 24, zIndex: 90, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--discord-blurple)" }}>
            {selectedIds.length} items selected
          </div>
          
          <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.1)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select 
              value={bulkCategory} 
              onChange={(e) => {
                const cat = e.target.value;
                setBulkCategory(cat);
                if (cat) handleBulkAction("change_category", { category: cat });
              }}
              disabled={performingBulk}
              style={{ padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
            >
              <option value="">Move to Category...</option>
              <option value="Adobe After Effects">Adobe After Effects</option>
              <option value="Adobe Premiere Pro">Adobe Premiere Pro</option>
              <option value="Adobe Photoshop">Adobe Photoshop</option>
              <option value="Alight Motion">Alight Motion</option>
              <option value="CapCut">CapCut</option>
              <option value="Sony Vegas Pro">Sony Vegas Pro</option>
              <option value="Davinci Resolve">Davinci Resolve</option>
              <option value="Video Star">Video Star</option>
              <option value="Topaz Labs">Topaz Labs</option>
            </select>

            <button 
              className="dash-btn" 
              onClick={() => handleBulkAction("toggle_premium", { is_premium: true })}
              disabled={performingBulk}
              style={{ background: "#fbbf24", color: "#000", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Make Premium
            </button>
            
            <button 
              className="dash-btn" 
              onClick={() => handleBulkAction("toggle_premium", { is_premium: false })}
              disabled={performingBulk}
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Make Free
            </button>

            <button
              className="dash-btn"
              onClick={() => handleBulkAction("set_hidden", { hidden: true })}
              disabled={performingBulk}
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <i className="bi bi-eye-slash" /> Hide
            </button>

            <button
              className="dash-btn"
              onClick={() => handleBulkAction("set_hidden", { hidden: false })}
              disabled={performingBulk}
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <i className="bi bi-eye" /> Unhide
            </button>

            <button
              className="dash-btn"
              onClick={() => handleBulkAction("set_protected", { is_protected: true })}
              disabled={performingBulk}
              style={{ background: "rgba(237, 66, 69, 0.18)", color: "#ed4245", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <i className="bi bi-shield-lock" /> Protect
            </button>

            <button 
              className="dash-btn" 
              onClick={() => handleBulkAction("delete")}
              disabled={performingBulk}
              style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <i className="bi bi-trash" /> Delete
            </button>
          </div>

          <button onClick={() => setSelectedIds([])} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
      )}
      
      {editingResource && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#18191c", width: 600, maxHeight: "90vh", overflowY: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", padding: 0 }}>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#18191c", zIndex: 10 }}>
              <h2 style={{ fontSize: 18, margin: 0, color: "#fff", fontWeight: 700 }}>Edit Resource</h2>
              <button onClick={() => setEditingResource(null)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4 }}><i className="bi bi-x-lg" style={{ fontSize: 18 }} /></button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <img src={editingResource.thumbnail_url || "/placeholder.png"} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{editingResource.name}</div>
                  <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
                    {editingResource.discord_member_name} • {new Date(editingResource.leaked_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="dashboard-form-row" style={{ marginBottom: 20 }}>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Resource Name</label>
                  <input type="text" value={editingResource.name || ""} onChange={e => setEditingResource({ ...editingResource, name: e.target.value })} />
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Editor (Creator Name)</label>
                  <input type="text" value={editingResource.editor_name || ""} onChange={e => setEditingResource({ ...editingResource, editor_name: e.target.value })} />
                  <div style={{ fontSize: 11, color: "#faa61a", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-exclamation-triangle" /> Changing this moves files on server!</div>
                </div>
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
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span>Thumbnail URL</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editingResource?.place_url) {
                          alert("Set a Product Link first to scrape its thumbnail.");
                          return;
                        }
                        try {
                          const res = await fetch("/api/resources/scrape", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: editingResource.place_url }),
                          });
                          const data = await res.json();
                          if (data?.thumbnail) {
                            setEditingResource({ ...editingResource, thumbnail_url: data.thumbnail });
                          } else {
                            alert(data?.error || "Scraper returned no thumbnail.");
                          }
                        } catch (err) {
                          alert("Scrape failed: " + (err instanceof Error ? err.message : String(err)));
                        }
                      }}
                      style={{ background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", color: "#949cf7", padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer" }}
                    >
                      <i className="bi bi-arrow-clockwise" /> Refresh from product link
                    </button>
                  </label>
                  <input type="text" value={editingResource.thumbnail_url || ""} onChange={e => setEditingResource({ ...editingResource, thumbnail_url: e.target.value })} placeholder="Leave empty to keep current" />
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Leave empty on save to keep the existing thumbnail. New external URLs are downloaded once and served locally.</div>
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Product Link (Shop/Place)</label>
                  <input type="text" value={editingResource.place_url || ""} onChange={e => setEditingResource({ ...editingResource, place_url: e.target.value })} placeholder="https://payhip.com/..." />
                </div>
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  File Path 
                  <span style={{ fontSize: 10, background: '#ff444422', color: '#ff4444', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}>Warning: Changing this will affect downloads</span>
                </label>
                <input 
                  type="text" 
                  value={editingResource.file_path || ""} 
                  onChange={e => setEditingResource({ ...editingResource, file_path: e.target.value })} 
                  placeholder="Internal file path (e.g. plugins/Skript/scripts/...)" 
                />
              </div>

              <div className="dashboard-form-group" style={{ marginBottom: 28 }}>
                <label>Creator Social URL (Profile Sync)</label>
                <input 
                  type="text" 
                  value={editingResource.editor_social_url || ""} 
                  onChange={e => setEditingResource({ ...editingResource, editor_social_url: e.target.value })} 
                  placeholder="https://instagram.com/creator"
                />
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Updates creator's social link across all their leaks.</div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Status & Category</h3>
              <div className="dashboard-form-row" style={{ marginBottom: 28 }}>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Status</label>
                  <select value={editingResource.status || "Completed"} onChange={e => setEditingResource({ ...editingResource, status: e.target.value })}>
                    <option value="Completed">Completed</option>
                    <option value="Processing">Processing</option>
                    <option value="Hidden">Hidden</option>
                  </select>
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
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

              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Settings</h3>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.02)", marginBottom: 28 }}>
                <div className="dashboard-toggle-row" style={{ padding: "16px 20px" }}>
                  <div className="dashboard-toggle-label">
                    <span className="dashboard-toggle-name">Premium Resource</span>
                    <span className="dashboard-toggle-desc">Requires premium access</span>
                  </div>
                  <label className="dashboard-form-check">
                    <input type="checkbox" className="dashboard-toggle-input" checked={editingResource.is_premium} onChange={e => setEditingResource({ ...editingResource, is_premium: e.target.checked })} />
                    <span className="dashboard-toggle-track"></span>
                  </label>
                </div>
                <div className="dashboard-toggle-row" style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="dashboard-toggle-label">
                    <span className="dashboard-toggle-name">Featured Resource</span>
                    <span className="dashboard-toggle-desc">Show in featured section</span>
                  </div>
                  <label className="dashboard-form-check">
                    <input type="checkbox" className="dashboard-toggle-input" checked={editingResource.is_featured || false} onChange={e => setEditingResource({ ...editingResource, is_featured: e.target.checked })} />
                    <span className="dashboard-toggle-track"></span>
                  </label>
                </div>
                <div className="dashboard-toggle-row" style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="dashboard-toggle-label">
                    <span className="dashboard-toggle-name">Counts for Payout</span>
                    <span className="dashboard-toggle-desc">Whether this resource counts toward leaker payouts</span>
                  </div>
                  <label className="dashboard-form-check">
                    <input type="checkbox" className="dashboard-toggle-input" checked={editingResource.counts_for_payout !== false} onChange={e => setEditingResource({ ...editingResource, counts_for_payout: e.target.checked })} />
                    <span className="dashboard-toggle-track"></span>
                  </label>
                </div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Uploader Information</h3>
              <div className="dashboard-form-row" style={{ marginBottom: 16 }}>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Uploader ID</label>
                  <input type="text" value={editingResource.discord_member_id || ""} onChange={e => setEditingResource({ ...editingResource, discord_member_id: e.target.value })} />
                </div>
                <div className="dashboard-form-group" style={{ marginBottom: 0 }}>
                  <label>Uploader Username</label>
                  <input type="text" value={editingResource.discord_member_name || ""} onChange={e => setEditingResource({ ...editingResource, discord_member_name: e.target.value })} />
                </div>
              </div>
              <div className="dashboard-form-group" style={{ marginBottom: 24 }}>
                <label>Uploader Avatar URL</label>
                <input type="text" value={editingResource.discord_member_avatar || ""} onChange={e => setEditingResource({ ...editingResource, discord_member_avatar: e.target.value })} placeholder="Optional override" />
              </div>

            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 12, background: "rgba(0,0,0,0.2)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button className="dash-btn dash-btn-ghost" onClick={() => setEditingResource(null)}>Cancel</button>
              <button className="dash-btn dash-btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
