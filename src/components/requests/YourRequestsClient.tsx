"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Pagination } from "./Pagination";
import { RequestCard } from "./RequestCard";
import { BiIcon } from "./BiIcon";

type RequestItem = {
  id: number;
  title: string | null;
  description: string | null;
  status: string;
  creator_url: string;
  product_url: string;
  image_url: string | null;
  price: string | null;
  upvotes: number;
  views: number;
  comments_count: number;
  created_at: string;
  username: string;
  user_id?: string | null;
  avatar?: string | null;
  avatar_decoration?: string | null;
  creator_name?: string | null;
  creator_avatar?: string | null;
  creator_platform?: string | null;
  leak_message_url?: string | null;
  comments_locked?: boolean;
  has_priority?: boolean;
  patreon_premium?: boolean;
};

export function YourRequestsClient() {
  const { data: session, status: sessionStatus } = useSession();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 18, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setLoading(false);
      setRequests([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
      sort: "recent",
      order: "desc",
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/requests/user/${session.user.id}?${params}`)
      .then((r) => (r.ok ? r.json() : { requests: [], pagination: {} }))
      .then((data) => {
        if (cancelled) return;
        setRequests(Array.isArray(data.requests) ? data.requests : []);
        if (data.pagination && typeof data.pagination === "object") {
          setPagination((p) => ({
            ...p,
            page: Number(data.pagination.page) ?? p.page,
            limit: Number(data.pagination.limit) ?? p.limit,
            total: Number(data.pagination.total) ?? 0,
            totalPages: Number(data.pagination.totalPages) ?? 0,
          }));
        }
      })
      .catch(() => { if (!cancelled) setRequests([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.user?.id, sessionStatus, pagination.page, statusFilter]);

  if (sessionStatus === "loading") {
    return (
      <>
        <Link href="/requests" className="requests-back-link">← Back to requests</Link>
        <div className="your-requests-loading">
          <div className="your-requests-loading-spinner" aria-hidden />
          <p>Loading…</p>
        </div>
      </>
    );
  }

  if (!session?.user) {
    const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/requests/your-requests` : "/requests/your-requests";
    const loginUrl = `/api/auth/signin/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return (
      <>
        <Link href="/requests" className="requests-back-link">← Back to requests</Link>
        <section className="protected-hero">
          <BiIcon name="clipboard-data" size={48} className="protected-hero-icon" aria-hidden />
          <h1>Your requests</h1>
          <p className="protected-hero-subtitle">View and manage your submitted requests.</p>
        </section>
        <div className="login-prompt">
          <h2>Log in to view your requests</h2>
          <p>Please log in with Discord to see your requests.</p>
          <Link href={loginUrl} className="requests-btn-submit" style={{ display: "inline-block", marginTop: 12, padding: "10px 20px", textDecoration: "none" }}>
            Login with Discord
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>
      <section className="protected-hero">
        <BiIcon name="clipboard-data" size={48} className="protected-hero-icon" aria-hidden />
        <h1>Your requests</h1>
        <p className="protected-hero-subtitle">View and manage your submitted requests.</p>
      </section>
      <div className="your-requests-stats">
        <div className="stat-item">
          <strong>{pagination.total}</strong> total
        </div>
        {statusFilter === "all" && (
          <>
            <div className="stat-item">
              <strong>{requests.filter((r) => r.status === "pending").length}</strong> pending
            </div>
            <div className="stat-item">
              <strong>{requests.filter((r) => r.status === "completed").length}</strong> completed
            </div>
          </>
        )}
      </div>

      <div className="your-requests-filters">
        <div className="filter-group">
          <span className="filter-label">Status</span>
          <div className="filter-buttons">
            {(["all", "pending", "completed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-btn ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s === "pending" ? "Pending" : "Completed"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="your-requests-loading">
          <div className="your-requests-loading-spinner" aria-hidden />
          <p>Loading…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="your-requests-empty">
          <h3>No requests yet</h3>
          <p>You have not submitted any requests yet.</p>
          <Link href="/requests">Browse requests</Link>
        </div>
      ) : (
        <>
          <div className="your-requests-list">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} variant="yours" />
            ))}
          </div>
          <div className="your-requests-pagination">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          />
          </div>
        </>
      )}
    </>
  );
}
