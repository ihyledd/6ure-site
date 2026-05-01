"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/requests/UserAvatar";
import { formatDate } from "@/lib/requests-utils";

type ResourceItem = {
  id: number;
  editor_name: string;
  name: string;
  file_path: string | null;
  thumbnail_url: string | null;
  place_url: string | null;
  category: string | null;
  download_count: number;
  view_count: number;
  is_premium: boolean;
  is_protected?: boolean | number;
  leaked_at: string | null;
  editor_social_url: string | null;
  editor_avatar_url: string | null;
  discord_member_id: string | null;
  discord_member_name: string | null;
  discord_member_avatar: string | null;
};

type Stats = { total: number; editors: number; total_downloads: number; total_views: number };
type Pagination = { page: number; limit: number; total: number; totalPages: number };
type EditorInfo = { name: string; resource_count: number };

export function ResourcesPageClient() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, editors: 0, total_downloads: 0, total_views: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, totalPages: 0 });
  const [topEditors, setTopEditors] = useState<EditorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editorFilter, setEditorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [animatedStats, setAnimatedStats] = useState({ total: 0, editors: 0, total_downloads: 0, total_views: 0 });
  const hasLoadedMetadata = useRef(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Persist view mode in localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("resources-view-mode");
      if (stored === "grid" || stored === "list") setViewMode(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("resources-view-mode", viewMode); } catch {}
  }, [viewMode]);

  // Animated stat counters
  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = performance.now();
    const target = { ...stats };
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedStats({
        total: Math.floor(target.total * ease),
        editors: Math.floor(target.editors * ease),
        total_downloads: Math.floor(target.total_downloads * ease),
        total_views: Math.floor((target.total_views || 0) * ease),
      });
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stats]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sort: sortBy,
        order: sortOrder,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (editorFilter) params.set("editor", editorFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (premiumFilter !== "all") params.set("premium", premiumFilter);
      if (hasLoadedMetadata.current) params.set("skipMetadata", "1");
      try {
        const res = await fetch(`/api/resources?${params}`);
        if (cancelled) return;
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setItems([]);
        } else {
          setError(null);
          setItems(data.items ?? []);
          setPagination(data.pagination ?? { page: 1, limit: 24, total: 0, totalPages: 0 });
          if (data.stats) {
            setStats(data.stats);
            hasLoadedMetadata.current = true;
          }
          if (data.topEditors) setTopEditors(data.topEditors);
          if (data.categories) setCategories(data.categories);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to fetch resources");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pagination.page, sortBy, sortOrder, debouncedSearch, editorFilter, categoryFilter, premiumFilter]);

  const goToPage = useCallback((p: number) => {
    setPagination(prev => ({ ...prev, page: p }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Pagination numbers
  function getPaginationNumbers() {
    const { page, totalPages } = pagination;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="requests-container" style={{ maxWidth: 1320, margin: "0 auto", padding: "0 24px 60px" }}>
      {/* Hero */}
      <section className="requests-hero">
        <div className="requests-hero-logo">
          <img src="https://images.6ureleaks.com/logos/Untitled10.png" alt="6ure Resources" />
        </div>
        <h1 className="requests-hero-title">
          Browse <span className="gradient-text">Resources</span>
        </h1>
        <p className="requests-hero-subtitle">
          Download premium video editing packs, presets, templates and more
        </p>
      </section>

      {/* Stats bar */}
      <div className="requests-stats-bar" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="requests-stat-card requests-stat-card-total">
          <div className="requests-stat-icon"><i className="bi bi-file-earmark-zip" /></div>
          <div className="requests-stat-value">{animatedStats.total.toLocaleString()}</div>
          <div className="requests-stat-label">Resources</div>
        </div>
        <div className="requests-stat-card requests-stat-card-users">
          <div className="requests-stat-icon"><i className="bi bi-people" /></div>
          <div className="requests-stat-value">{animatedStats.editors.toLocaleString()}</div>
          <div className="requests-stat-label">Editors</div>
        </div>
        <div className="requests-stat-card requests-stat-card-completed">
          <div className="requests-stat-icon"><i className="bi bi-download" /></div>
          <div className="requests-stat-value">{animatedStats.total_downloads.toLocaleString()}</div>
          <div className="requests-stat-label">Downloads</div>
        </div>
      </div>

      {/* Filters */}
      <div className="requests-filters-section">
        <div className="requests-search-wrap" style={{ marginBottom: 0 }}>
          <svg className="requests-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="requests-search-input"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          />
        </div>

        <div className="requests-filter-tabs">
          {([
            { key: "recent", label: "Recent", icon: "bi-clock" },
            { key: "popular", label: "Popular", icon: "bi-fire" },
            { key: "name", label: "Name", icon: "bi-sort-alpha-down" },
            { key: "downloads", label: "Downloads", icon: "bi-download" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              className={`requests-filter-tab ${sortBy === key ? "active" : ""}`}
              onClick={() => {
                if (sortBy === key) setSortOrder(o => o === "desc" ? "asc" : "desc");
                else { setSortBy(key); setSortOrder("desc"); }
              }}
            >
              <i className={`bi ${icon}`} />
              {label}
              {sortBy === key && <span style={{ fontSize: 11, opacity: 0.7 }}>{sortOrder === "desc" ? "↓" : "↑"}</span>}
            </button>
          ))}
        </div>

        {/* Category icon bar */}
        <div className="resources-category-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            className={`resources-category-pill ${!categoryFilter ? "active" : ""}`}
            onClick={() => { setCategoryFilter(""); setPagination(p => ({ ...p, page: 1 })); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 999,
              background: !categoryFilter ? "var(--discord-blurple)" : "var(--bg-secondary)",
              color: !categoryFilter ? "#fff" : "inherit",
              border: "1px solid var(--border-subtle)", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}
          >
            <i className="bi bi-grid" /> All
          </button>
          {categories.map(c => {
            const iconMap: Record<string, string> = {
              "Adobe After Effects": "ae.png",
              "Adobe Premiere Pro": "pr.png",
              "Adobe Photoshop": "ps.png",
              "Alight Motion": "am.png",
              "CapCut": "cc.png",
              "Sony Vegas Pro": "sv.png",
              "Davinci Resolve": "dr.png",
              "Video Star": "vs.png",
              "Topaz Labs": "tl.png",
            };
            const icon = iconMap[c.category];
            const active = categoryFilter === c.category;
            return (
              <button
                key={c.category}
                className={`resources-category-pill ${active ? "active" : ""}`}
                onClick={() => { setCategoryFilter(active ? "" : c.category); setPagination(p => ({ ...p, page: 1 })); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 999,
                  background: active ? "var(--discord-blurple)" : "var(--bg-secondary)",
                  color: active ? "#fff" : "inherit",
                  border: "1px solid var(--border-subtle)", cursor: "pointer",
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {icon ? (
                  <img src={`https://images.6ureleaks.com/logos/${icon}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : null}
                <span>{c.category}</span>
                <span style={{ opacity: 0.7, fontWeight: 500 }}>({c.count})</span>
              </button>
            );
          })}
        </div>

        {/* Access + view toggle row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <select
            className="requests-search-input"
            style={{ width: "auto", minWidth: 140, appearance: "auto", height: 42, cursor: "pointer", padding: "0 12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 10, color: "inherit", outline: "none" }}
            value={premiumFilter}
            onChange={(e) => { setPremiumFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="all">All Access</option>
            <option value="1">Premium Only</option>
            <option value="0">Free Only</option>
          </select>

          <div className="resources-view-toggle" style={{ display: "inline-flex", border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{ padding: "8px 14px", background: viewMode === "grid" ? "var(--discord-blurple)" : "transparent", color: viewMode === "grid" ? "#fff" : "inherit", border: "none", cursor: "pointer", fontSize: 13 }}
              aria-label="Grid view"
            >
              <i className="bi bi-grid-3x3-gap" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{ padding: "8px 14px", background: viewMode === "list" ? "var(--discord-blurple)" : "transparent", color: viewMode === "list" ? "#fff" : "inherit", border: "none", cursor: "pointer", fontSize: 13 }}
              aria-label="List view"
            >
              <i className="bi bi-list-ul" />
            </button>
          </div>
        </div>

        {editorFilter && (
          <div className="requests-tip-popover">
            <div className="requests-tip-icon"><i className="bi bi-person-fill" /></div>
            <p className="requests-tip-text">Showing by <strong>{editorFilter}</strong></p>
            <button className="requests-tip-close" onClick={() => setEditorFilter("")}>✕</button>
          </div>
        )}
      </div>

      {/* Grid / List */}
      <div>
        {loading ? (
          <div className="requests-grid" style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr", gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ResourceSkeleton key={i} mode={viewMode} />
            ))}
          </div>
        ) : error ? (
          <div className="requests-empty-state" style={{ color: "var(--danger)" }}>
            <h3 className="requests-empty-title">Error loading resources</h3>
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="requests-empty-state" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, opacity: 0.4, marginBottom: 12 }}>
              <i className="bi bi-inbox" />
            </div>
            <h3 className="requests-empty-title">No resources found</h3>
            <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>Try adjusting your search or filter criteria.</p>
            {(search || categoryFilter || premiumFilter !== "all" || editorFilter) && (
              <button
                className="dash-btn dash-btn-ghost"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setSearch(""); setCategoryFilter(""); setPremiumFilter("all"); setEditorFilter("");
                  setPagination(p => ({ ...p, page: 1 }));
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="requests-grid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => (
              <ResourceListRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="requests-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {items.map((item) => (
              <ResourceCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>
            <i className="bi bi-chevron-left" /> Previous
          </button>
          <div className="pagination-pages">
            {getPaginationNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="pagination-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`pagination-num ${pagination.page === p ? "active" : ""}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button className="pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}

function ResourceCard({ item }: { item: ResourceItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/resources/${item.id}`} className={`request-card ${item.is_premium ? "premium" : ""}`}>
      {/* Image */}
      {item.thumbnail_url && !imgError ? (
          <div className="request-image-wrapper loading-shimmer" style={{ aspectRatio: "16/9", background: "var(--bg-tertiary)", position: "relative", overflow: "hidden" }}>
            <div className="request-image" style={{ width: "100%", height: "100%" }}>
              <Image 
                src={item.thumbnail_url || ""} 
                alt={item.name} 
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: "cover" }}
                onError={() => setImgError(true)}
              />
              <div className="image-overlay" />
            </div>
          </div>
        ) : (
          <div className="request-image-placeholder" style={{ aspectRatio: "16/9", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", borderRadius: "12px 12px 0 0" }}>
            <div className="placeholder-icon" style={{ opacity: 0.3 }}>📦</div>
          </div>
        )}

      {/* Content */}
      <div className="request-content">
        <div className="request-tags">
          {item.category && (
            <span className="request-tag" style={{ "--tag-color": "var(--discord-blurple)" } as React.CSSProperties}>
              <img 
                src={`https://images.6ureleaks.com/logos/${
                  item.category === "Adobe After Effects" ? "ae.png" :
                  item.category === "Adobe Premiere Pro" ? "pr.png" :
                  item.category === "Adobe Photoshop" ? "ps.png" :
                  item.category === "Alight Motion" ? "am.png" :
                  item.category === "CapCut" ? "cc.png" :
                  item.category === "Sony Vegas Pro" ? "sv.png" :
                  item.category === "Davinci Resolve" ? "dr.png" :
                  item.category === "Video Star" ? "vs.png" :
                  item.category === "Topaz Labs" ? "tl.png" : ""
                }`}
                alt=""
                style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <span>{item.category}</span>
            </span>
          )}
          {item.is_premium ? (
            <span className="request-tag" style={{ "--tag-color": "#fbbf24" } as React.CSSProperties}>
              <i className="bi bi-star-fill" style={{ fontSize: 14 }} />
              <span>Premium</span>
            </span>
          ) : (
            <span className="request-tag" style={{ "--tag-color": "#2dc770" } as React.CSSProperties}>
              <span>Free</span>
            </span>
          )}
          {item.is_protected ? (
            <span className="request-tag" style={{ "--tag-color": "#ed4245" } as React.CSSProperties} title="Protected — exempt from restore operations">
              <i className="bi bi-shield-lock" style={{ fontSize: 14 }} />
              <span>Protected</span>
            </span>
          ) : null}
        </div>

        <div className="request-header">
          <h3 className="request-title">{item.name}</h3>
        </div>

        <div className="request-footer">
          {/* Row 1: Uploader (Discord) + Date */}
          <div className="request-meta-row">
            <div className="request-author-info">
              <UserAvatar
                avatar={item.discord_member_avatar}
                userId={item.discord_member_id}
                size={24}
                displayName={item.discord_member_name}
              />
              <span className="request-author">{item.discord_member_name || "Staff"}</span>
            </div>
            <span className="request-date" suppressHydrationWarning>{formatDate(item.leaked_at)}</span>
          </div>

          {/* Row 2: Creator & Product buttons */}
          <div className="request-links-row" style={{ marginTop: 12 }}>
            <div 
              className="request-link-btn request-creator-link"
              style={{ flex: 1, justifyContent: "flex-start", gap: 8, cursor: "default" }}
              onClick={(e) => {
                if (item.editor_social_url) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(item.editor_social_url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <div className="author-avatar" style={{ 
                width: 22, height: 22, borderRadius: "50%", overflow: "hidden", 
                background: "var(--bg-tertiary)", display: "flex", alignItems: "center", 
                justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff",
                flexShrink: 0
              }}>
                {item.editor_avatar_url ? (
                  <img 
                    src={item.editor_avatar_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{item.editor_name?.charAt(0).toUpperCase() || "?"}</span>
                )}
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.editor_name || "Unknown"}
              </span>
              {item.editor_social_url && <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10, opacity: 0.6 }} />}
            </div>

            {item.place_url && (
              <a
                href={item.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className="request-link-btn"
                style={{ padding: "0 10px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <span>Product</span>
                <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
              </a>
            )}
          </div>

          {/* Row 3: Stats + View */}
          <div className="request-actions" style={{ marginTop: 12 }}>
            <span className="btn-upvote" style={{ cursor: "default" }}>
              <i className="bi bi-download" />
              <span>{item.download_count || 0}</span>
            </span>
            <div className="request-views" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--discord-blurple)", fontWeight: 600, fontSize: 13 }}>
              <span>View</span>
              <i className="bi bi-arrow-right" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ResourceSkeleton({ mode }: { mode: "grid" | "list" }) {
  if (mode === "list") {
    return (
      <div className="loading-shimmer" style={{ display: "flex", gap: 16, padding: 12, borderRadius: 12, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
        <div style={{ width: 100, height: 60, borderRadius: 8, background: "var(--bg-tertiary)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ width: "60%", height: 14, borderRadius: 4, background: "var(--bg-tertiary)" }} />
          <div style={{ width: "40%", height: 12, borderRadius: 4, background: "var(--bg-tertiary)" }} />
        </div>
      </div>
    );
  }
  return (
    <div className="loading-shimmer" style={{ borderRadius: 12, overflow: "hidden", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
      <div style={{ aspectRatio: "16/9", background: "var(--bg-tertiary)" }} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: "70%", height: 14, borderRadius: 4, background: "var(--bg-tertiary)" }} />
        <div style={{ width: "40%", height: 12, borderRadius: 4, background: "var(--bg-tertiary)" }} />
        <div style={{ width: "90%", height: 32, borderRadius: 8, background: "var(--bg-tertiary)", marginTop: 8 }} />
      </div>
    </div>
  );
}

function ResourceListRow({ item }: { item: ResourceItem }) {
  return (
    <Link href={`/resources/${item.id}`} className="request-card" style={{ display: "flex", gap: 16, padding: 12, alignItems: "center", textDecoration: "none" }}>
      <div style={{ width: 120, height: 70, borderRadius: 8, background: "var(--bg-tertiary)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
        {item.thumbnail_url ? (
          <Image src={item.thumbnail_url} alt={item.name} fill sizes="120px" style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, opacity: 0.3 }}>📦</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{item.name}</div>
          {item.is_premium && (
            <span className="request-tag" style={{ "--tag-color": "#fbbf24" } as React.CSSProperties}>
              <i className="bi bi-star-fill" style={{ fontSize: 12 }} /> Premium
            </span>
          )}
          {item.is_protected ? (
            <span className="request-tag" style={{ "--tag-color": "#ed4245" } as React.CSSProperties}>
              <i className="bi bi-shield-lock" style={{ fontSize: 12 }} /> Protected
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          By <strong>{item.editor_name}</strong>
          {item.category ? <> • {item.category}</> : null}
          {" • "}<i className="bi bi-download" /> {item.download_count}
        </div>
      </div>
      <div style={{ color: "var(--discord-blurple)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        View <i className="bi bi-arrow-right" />
      </div>
    </Link>
  );
}
