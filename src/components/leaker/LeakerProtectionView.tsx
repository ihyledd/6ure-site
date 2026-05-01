"use client";

import { useEffect, useState } from "react";

type ProtectedCreator = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  creatorPlatform: string | null;
  creatorBio: string | null;
  socialLink: string | null;
  subscriptionEndsAt: string | null;
  urls: string[];
  resourceNames: string[];
};

type ProtectedLink = {
  id: string | number;
  groupName: string;
  link: string;
  type: "link" | "keyword";
  enabled?: boolean;
};

type Overview = {
  creators: ProtectedCreator[];
  links: ProtectedLink[];
  counts: { creators: number; protectedResources: number; links: number };
};

function isUserType(searchType: string, c: ProtectedCreator): boolean {
  if (searchType === "all") return true;
  if (searchType === "tiktok") return c.creatorPlatform === "tiktok";
  if (searchType === "youtube") return c.creatorPlatform === "youtube";
  return true;
}

function formatDate(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function LeakerProtectionView() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "tiktok" | "youtube">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/protection/overview");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json?.error || "Failed to load");
        } else {
          setData(json);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredCreators = (data?.creators || []).filter((c) => {
    if (!isUserType(typeFilter, c)) return false;
    if (search) {
      const s = search.toLowerCase();
      const hits = [c.creatorName, c.displayName, c.username, ...c.urls, ...c.resourceNames]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
      if (!hits) return false;
    }
    return true;
  });

  return (
    <div className="leaker-protected-view">
      <div className="dash-header" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="dash-title">Protected Editors</h1>
          <p className="dash-subtitle">View protected creators, resources, and links that cannot be targeted</p>
        </div>
        <div style={{ fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-shield-lock" /> {data?.counts.protectedResources ?? 0} protected items
        </div>
      </div>

      <div style={{ background: "rgba(88,101,242,0.05)", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <i className="bi bi-info-circle-fill" style={{ color: "#949cf7", fontSize: 18, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 4 }}>Protection Rules</div>
          <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
            The following creators, resources, and links are protected and cannot be targeted in uploads. Attempting to upload content matching these items will be blocked.
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 200px", gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Search</label>
          <div style={{ position: "relative", marginTop: 6 }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
            <input
              type="text"
              placeholder="Search protected items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6, fontSize: 13 }}
          >
            <option value="all">All Types</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
      </div>

      {loading && <div style={{ color: "#aaa", padding: 16 }}>Loading…</div>}
      {error && <div style={{ color: "#ed4245", padding: 16 }}>{error}</div>}

      {!loading && !error && filteredCreators.length === 0 && (
        <div style={{ padding: 30, textAlign: "center", color: "#888", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12 }}>
          No protected creators match your filter.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {filteredCreators.map((c) => {
          const expanded = expandedId === c.userId;
          const displayName = c.creatorName || c.displayName || c.username || c.userId;
          const avatar = c.creatorAvatar || c.avatar;
          const platformLabel = c.creatorPlatform === "tiktok" ? "TikTok" : c.creatorPlatform === "youtube" ? "YouTube" : "User";
          return (
            <div key={c.userId} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : c.userId)}
                style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 18px", background: "transparent", border: "none", color: "inherit", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.05)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                  {avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <i className="bi bi-person-circle" style={{ fontSize: 22 }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15, color: "#fff" }}>{displayName}</strong>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(255,255,255,0.06)", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{platformLabel}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(237, 66, 69, 0.12)", color: "#ed4245", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Protected Item</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {c.urls.length} URL{c.urls.length === 1 ? "" : "s"} · {c.resourceNames.length} Resource{c.resourceNames.length === 1 ? "" : "s"}
                    {c.creatorBio ? <> — {c.creatorBio}</> : null}
                  </div>
                </div>
                <i className={`bi bi-chevron-${expanded ? "up" : "down"}`} style={{ color: "#888" }} />
              </button>

              {expanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 18 }}>
                  <h4 style={{ fontSize: 12, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-link-45deg" /> Product URLs ({c.urls.length})
                  </h4>
                  {c.urls.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>No protected URLs recorded for this creator yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                      {c.urls.map((u, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontFamily: "monospace", fontSize: 12, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u}
                        </div>
                      ))}
                    </div>
                  )}

                  <h4 style={{ fontSize: 12, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bi bi-file-earmark-text" /> Resource Names ({c.resourceNames.length})
                  </h4>
                  {c.resourceNames.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>No protected resources recorded.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                      {c.resourceNames.map((n, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 13, color: "#ddd" }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 12, color: "#888" }}>
                    <div>Protected Since: <span style={{ color: "#fff" }}>{formatDate(c.subscriptionEndsAt)}</span></div>
                    <div>Editor: <span style={{ color: "#fff" }}>{c.creatorName || c.displayName || "—"}</span></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Protected Links section */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-link-45deg" /> Protected Links &amp; Keywords ({data?.links.length ?? 0})
        </h2>
        <p style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>
          Any product URL or social link matching one of these entries is automatically blocked from upload.
        </p>
        {!data?.links.length ? (
          <div style={{ padding: 18, color: "#666", textAlign: "center" }}>No protected links configured.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, maxHeight: 400, overflowY: "auto" }}>
            {data.links.map((l) => (
              <div key={String(l.id)} style={{ padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, opacity: l.enabled === false ? 0.5 : 1 }}>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: l.type === "keyword" ? "rgba(250, 166, 26, 0.15)" : "rgba(88, 101, 242, 0.15)", color: l.type === "keyword" ? "#faa61a" : "#949cf7", fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>{l.type}</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={l.link}>{l.link}</span>
                <span style={{ fontSize: 10, color: "#666" }}>{l.groupName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
