"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ResourceItem = {
  id: number;
  name: string;
  editor_name: string;
  place_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  is_protected: boolean | number | null;
  hidden: boolean | number | null;
  status: string | null;
  leaked_at: string | null;
};

function isProtectedOrHidden(r: ResourceItem) {
  return Number(r.is_protected) === 1 || Number(r.hidden) === 1 || r.status === "Hidden";
}

export function ProtectedResourcesTab() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeHidden", "1");
      params.set("limit", "100");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/resources?${params}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const protectedItems = useMemo(() => items.filter(isProtectedOrHidden), [items]);
  const searchResults = useMemo(() => items.filter((r) => !isProtectedOrHidden(r)).slice(0, 20), [items]);

  async function patchResource(id: number, isProtected: boolean) {
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/protection/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_protected: isProtected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update resource");
      setMessage(isProtected ? "Resource marked protected and hidden." : "Protection removed and resource unhidden.");
      await load();
    } catch (e: any) {
      setMessage(e?.message || "Failed to update resource");
    } finally {
      setSavingId(null);
      setTimeout(() => setMessage(null), 3500);
    }
  }

  return (
    <section className="dashboard-card">
      <div className="protection-manage-section-header">
        <h2 className="dashboard-card-title">Protected Resources</h2>
        <p className="dashboard-card-desc">
          Mark database resources as protected without moving YAML files. Protected resources are hidden from public pages and skipped by restore.
        </p>
      </div>

      {message && (
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: message.includes("Failed") ? "rgba(237,66,69,.12)" : "rgba(45,199,112,.1)", color: message.includes("Failed") ? "#ed4245" : "#2dc770", fontSize: 13 }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }}
          placeholder="Search resources by name or editor..."
          className="dashboard-input"
          style={{ minHeight: 42 }}
        />
        <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      {search.trim() && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: "#fff", marginBottom: 10 }}>Search results</h3>
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : searchResults.length === 0 ? (
            <p style={{ color: "#888" }}>No unprotected resources found for this search.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {searchResults.map((r) => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  actionLabel="Mark Protected"
                  actionColor="#ed4245"
                  disabled={savingId === r.id}
                  onAction={() => patchResource(r.id, true)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 style={{ fontSize: 14, color: "#fff", marginBottom: 10 }}>Currently protected / hidden resources ({protectedItems.length})</h3>
        {loading ? (
          <p style={{ color: "#aaa" }}>Loading...</p>
        ) : protectedItems.length === 0 ? (
          <p style={{ color: "#888" }}>No protected database resources yet. Search above and mark resources as protected.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {protectedItems.map((r) => (
              <ResourceRow
                key={r.id}
                resource={r}
                actionLabel="Remove Protection"
                actionColor="#2dc770"
                disabled={savingId === r.id}
                onAction={() => patchResource(r.id, false)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResourceRow({ resource, actionLabel, actionColor, disabled, onAction }: {
  resource: ResourceItem;
  actionLabel: string;
  actionColor: string;
  disabled: boolean;
  onAction: () => void;
}) {
  const protectedFlag = Number(resource.is_protected) === 1;
  const hiddenFlag = Number(resource.hidden) === 1 || resource.status === "Hidden";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,.05)", flexShrink: 0 }}>
        {resource.thumbnail_url ? <img src={resource.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ color: "#fff", fontSize: 14 }}>{resource.name}</strong>
          {protectedFlag && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(237,66,69,.14)", color: "#ed4245", fontWeight: 700 }}>PROTECTED</span>}
          {hiddenFlag && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(255,255,255,.08)", color: "#aaa", fontWeight: 700 }}>HIDDEN</span>}
        </div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          {resource.editor_name} {resource.place_url ? <>• <span style={{ fontFamily: "monospace" }}>{resource.place_url}</span></> : null}
        </div>
      </div>
      <Link href={`/resources/${resource.id}`} target="_blank" className="dashboard-btn dashboard-btn-ghost" style={{ padding: "7px 10px" }}>
        View
      </Link>
      <button type="button" className="dashboard-btn" onClick={onAction} disabled={disabled} style={{ background: actionColor, color: "#fff", border: "none", padding: "7px 12px" }}>
        {disabled ? "Saving..." : actionLabel}
      </button>
    </div>
  );
}
