"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GuildInvitePopup } from "./GuildInvitePopup";
import { RequestForm } from "./RequestForm";
import { RequestsQuickLinksSidebar, RequestsQuickLinksFooter } from "./RequestsQuickLinks";
import { RequestsTipPopover } from "./RequestsTipPopover";
import { BiIcon } from "./BiIcon";
import { Pagination } from "./Pagination";
import { RequestCard } from "./RequestCard";

type Stats = { total: number; pending: number; completed: number; users: number };

type RequestItem = {
  id: number;
  title: string | null;
  description: string | null;
  creator_url: string;
  product_url: string;
  image_url: string | null;
  price: string | null;
  status: string;
  upvotes: number;
  views: number;
  comments_count: number;
  created_at: string;
  username: string;
  user_id?: string | null;
  avatar?: string | null;
  avatar_decoration?: string | null;
  anonymous?: boolean;
  hasUpvoted?: boolean;
  is_staff?: boolean;
  patreon_premium?: boolean;
  creator_name?: string | null;
  creator_avatar?: string | null;
  creator_platform?: string | null;
  leak_message_url?: string | null;
  comments_locked?: boolean;
  has_priority?: boolean;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export function RequestsPageClient({
  initialStats,
  discordLoginUrl,
  initialQuickLinksPosition,
  initialShowStaffBadge,
}: {
  initialStats: Stats;
  discordLoginUrl: string;
  initialQuickLinksPosition?: "sidebar" | "footer" | "hidden";
  initialShowStaffBadge?: boolean;
}) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 18,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [showForm, setShowForm] = useState(false);
  const [showGuildInvitePopup, setShowGuildInvitePopup] = useState(false);
  const [inGuild, setInGuild] = useState<boolean | null>(null);
  const [checkingInGuild, setCheckingInGuild] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStaffBadge, setShowStaffBadge] = useState(initialShowStaffBadge ?? false);
  const [quickLinksPosition, setQuickLinksPosition] = useState<"sidebar" | "footer" | "hidden">(
    initialQuickLinksPosition ?? "sidebar"
  );
  const [upvoting, setUpvoting] = useState<Record<number, boolean>>({});
  const [animatedStats, setAnimatedStats] = useState({ total: 0, pending: 0, completed: 0, users: 0 });

  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = performance.now();
    const target = { ...stats };
    
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      setAnimatedStats({
        total: Math.floor(target.total * ease),
        pending: Math.floor(target.pending * ease),
        completed: Math.floor(target.completed * ease),
        users: Math.floor(target.users * ease),
      });
      
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stats]);


  useEffect(() => {
    fetch("/api/site-settings/requests-display")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { staff_badge_visible?: string; quick_links_position?: string }) => {
        setShowStaffBadge((d?.staff_badge_visible ?? "false") === "true");
        const pos = d?.quick_links_position ?? "sidebar";
        setQuickLinksPosition(pos === "footer" || pos === "hidden" ? pos : "sidebar");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setInGuild(null);
      return;
    }
    let cancelled = false;
    setCheckingInGuild(true);
    fetch("/api/auth/in-guild")
      .then((r) => (r.ok ? r.json() : { inGuild: false }))
      .then((d) => {
        if (!cancelled) setInGuild(!!d.inGuild);
      })
      .catch(() => {
        if (!cancelled) setInGuild(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingInGuild(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          sort: sortBy,
          order: sortOrder,
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());
        const url =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/requests?${params}`
            : `/api/requests?${params}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (!res.ok) {
          setRequests([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setRequests(Array.isArray(data.requests) ? data.requests : []);
        if (data.pagination && typeof data.pagination === "object") {
          setPagination({
            page: Number(data.pagination.page) || 1,
            limit: Number(data.pagination.limit) || 18,
            total: Number(data.pagination.total) || 0,
            totalPages: Number(data.pagination.totalPages) || 0,
          });
        }
      } catch (err) {
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pagination.page, sortBy, sortOrder, search, statusFilter, refreshKey]);

  const handleSubmitRequestClick = () => {
    if (!session?.user) {
      setShowGuildInvitePopup(true);
      return;
    }
    if (inGuild === false) {
      setShowGuildInvitePopup(true);
      return;
    }
    if (inGuild === true) {
      setShowForm(true);
      return;
    }
    if (inGuild === null && !checkingInGuild) {
      setShowGuildInvitePopup(true);
      return;
    }
    setShowForm(true);
  };

  const handleUpvote = async (e: React.MouseEvent, requestId: number, currentUpvoted: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user?.id || upvoting[requestId]) return;
    setUpvoting((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await fetch(`/api/upvotes/${requestId}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.upvoted !== undefined) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, hasUpvoted: data.upvoted, upvotes: Number(data.upvotes ?? r.upvotes) }
              : r
          )
        );
      }
    } finally {
      setUpvoting((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleIveJoined = async () => {
    const res = await fetch("/api/auth/in-guild");
    const d = await res.json().catch(() => ({}));
    if (d.inGuild) {
      setInGuild(true);
      setShowGuildInvitePopup(false);
      setShowForm(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/requests/stats`
        : "/api/requests/stats";
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.total === "number") setStats(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`requests-container ${quickLinksPosition === "sidebar" ? "requests-with-sidebar" : ""}`} style={{ maxWidth: quickLinksPosition === "sidebar" ? 1400 : 1200, margin: "0 auto", padding: "24px 16px" }}>
      <div className="requests-main">
      <section className="requests-hero requests-hero-full">
        <div className="requests-hero-logo">
          <img src="https://images.6ureleaks.com/logos/Untitled10.png" alt="6ure Requests" />
        </div>
        <h1 className="requests-hero-title">
          Request <span className="requests-gradient-text">Premium Content</span>
        </h1>
        <p className="requests-hero-subtitle">
          Request your most desired video editing packs, presets, templates and way more
        </p>
        {session?.user ? (
          <button
            type="button"
            onClick={handleSubmitRequestClick}
            className="requests-btn-submit"
            disabled={checkingInGuild}
          >
            <BiIcon name="plus-lg" size={18} style={{ marginRight: 8 }} />
            {checkingInGuild ? "Checking…" : "Submit Request"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitRequestClick}
            className="requests-btn-submit"
          >
            <BiIcon name="plus-lg" size={18} style={{ marginRight: 8 }} />
            Submit Request
          </button>
        )}
      </section>

      <section className="requests-stats-bar" aria-label="Platform stats">
        <div className="requests-stat-card requests-stat-card-total">
          <div className="requests-stat-icon" aria-hidden><BiIcon name="clipboard-data" size={20} /></div>
          <span className="requests-stat-value">{animatedStats.total}</span>
          <span className="requests-stat-label">Requests</span>
        </div>
        <div className="requests-stat-card requests-stat-card-pending">
          <div className="requests-stat-icon" aria-hidden><BiIcon name="clock-history" size={20} /></div>
          <span className="requests-stat-value">{animatedStats.pending}</span>
          <span className="requests-stat-label">Pending</span>
        </div>
        <div className="requests-stat-card requests-stat-card-completed">
          <div className="requests-stat-icon" aria-hidden><BiIcon name="check-circle-fill" size={20} /></div>
          <span className="requests-stat-value">{animatedStats.completed}</span>
          <span className="requests-stat-label">Completed</span>
        </div>
        <div className="requests-stat-card requests-stat-card-users">
          <div className="requests-stat-icon" aria-hidden><BiIcon name="people-fill" size={20} /></div>
          <span className="requests-stat-value">{animatedStats.users}</span>
          <span className="requests-stat-label">Users</span>
        </div>

      </section>

      <div className="requests-filters-section">
        <RequestsTipPopover />
        <div className="requests-filter-tabs">
          <button
            type="button"
            className={`requests-filter-tab ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("all");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`requests-filter-tab ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("pending");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            Pending
          </button>
          <button
            type="button"
            className={`requests-filter-tab ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("completed");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            Completed
          </button>
        </div>
        <div className="requests-sort-search-row">
          <div className="requests-search-wrap">
            <BiIcon name="search" size={18} className="requests-search-icon" aria-hidden />
            <input
              type="search"
              placeholder="Search by title, description or creator name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="requests-search-input"
              aria-label="Search requests"
            />
          </div>
          <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 8 }}>Sort by:</span>
          {(["popular", "recent", "upvotes", "price"] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              className={sortBy === sort ? "requests-filter-tab requests-filter-tab-active" : "requests-filter-tab"}
              style={{ textTransform: "capitalize" }}
              onClick={() => {
                if (sortBy === sort) {
                  setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
                } else {
                  setSortBy(sort);
                  setSortOrder("desc");
                }
              }}
              title={sortBy === sort ? (sortOrder === "desc" ? "Click to sort ascending" : "Click to sort descending") : undefined}
            >
              {sort === "upvotes" ? "Most Upvotes" : sort === "popular" ? "Popular" : sort === "recent" ? "Recent" : "Price"}
              {sortBy === sort && <BiIcon name={sortOrder === "desc" ? "chevron-down" : "chevron-up"} size={14} style={{ marginLeft: 4 }} />}
            </button>
          ))}
          {!session?.user ? (
            <Link href={discordLoginUrl} className="ure-btn requests-signin-link" style={{ padding: "10px 20px", borderRadius: 8, fontWeight: 600, textDecoration: "none", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <BiIcon name="box-arrow-in-right" size={18} />
              Sign in to submit
            </Link>
          ) : null}
        </div>
      </div>

      {showGuildInvitePopup &&
        typeof document !== "undefined" &&
        createPortal(
          <GuildInvitePopup
            user={session?.user ?? null}
            onClose={() => setShowGuildInvitePopup(false)}
            onLogin={() => {
              window.location.href = discordLoginUrl;
            }}
            onIveJoined={handleIveJoined}
          />,
          document.body
        )}

      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <RequestForm
            user={session?.user ?? null}
            isPremium={(session?.user as { patreon_premium?: boolean } | undefined)?.patreon_premium}
            onRequestCreated={() => {
              setRefreshKey((k) => k + 1);
              fetch("/api/requests/stats")
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => d && setStats(d))
                .catch(() => {});
            }}
            onClose={() => setShowForm(false)}
            onNotInGuild={() => {
              setShowForm(false);
              setShowGuildInvitePopup(true);
            }}
            discordLoginUrl={discordLoginUrl}
          />,
          document.body
        )}

      {loading ? (
        <ul className="requests-grid requests-skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i} className="requests-skeleton-card">
              <div className="requests-skeleton-image" />
              <div className="requests-skeleton-body">
                <div className="requests-skeleton-line" style={{ width: "60%" }} />
                <div className="requests-skeleton-line" style={{ width: "80%" }} />
                <div className="requests-skeleton-line" style={{ width: "40%" }} />
              </div>
            </li>
          ))}
        </ul>
      ) : requests.length === 0 ? (
        <div className="requests-empty-state">
          <BiIcon name="folder2-open" size={64} className="requests-empty-icon" />
          <p className="requests-empty-title">No requests found</p>
          <p className="requests-empty-subtitle">Be the first to submit a request!</p>
        </div>
      ) : (
        <ul className="requests-grid">
          {requests.map((r) => (
            <li key={r.id}>
              <RequestCard
                request={r}
                variant="main"
                showStaffBadge={showStaffBadge}
                isStaff={(session?.user as { role?: string } | undefined)?.role === "ADMIN"}
                canUpvote={!!session?.user}
                onUpvote={handleUpvote}
                upvoting={upvoting[r.id]}
                onRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      />

      {quickLinksPosition === "footer" && (
        <RequestsQuickLinksFooter />
      )}
      </div>
      {quickLinksPosition === "sidebar" && (
        <RequestsQuickLinksSidebar />
      )}
    </div>
  );
}
