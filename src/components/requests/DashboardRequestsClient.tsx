"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/requests-utils";

type RequestRow = {
  id: number;
  title: string | null;
  status: string;
  upvotes: number;
  created_at: string;
  product_url?: string;
};

type Stats = {
  total: number;
  pending: number;
  completed: number;
  users: number;
};

export function DashboardRequestsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");

  const fetchData = async (pageOverride?: number) => {
    setLoading(true);
    const page = pageOverride ?? pagination.page;
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch("/api/requests/stats"),
        fetch(
          `/api/requests?page=${page}&limit=${pagination.limit}&sort=${sort}&order=desc` +
            (status ? `&status=${status}` : "") +
            (search ? `&search=${encodeURIComponent(search)}` : "")
        ),
      ]);
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setRequests(data.requests || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
        }));
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, status, sort]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchData(1);
  };

  const statusBadgeClass = (s: string) => {
    if (s === "completed") return "dashboard-request-badge completed";
    if (s === "pending") return "dashboard-request-badge pending";
    if (s === "rejected") return "dashboard-request-badge rejected";
    if (s === "cancelled") return "dashboard-request-badge cancelled";
    return "dashboard-request-badge";
  };

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Request queue</h1>
      <p className="dashboard-description">
        Manage and monitor content requests from the community.
      </p>

      {stats && (
        <div className="dashboard-requests-stats">
          <div className="dashboard-requests-stat-card">
            <span className="dashboard-requests-stat-value">{stats.total}</span>
            <span className="dashboard-requests-stat-label">Total</span>
          </div>
          <div className="dashboard-requests-stat-card">
            <span className="dashboard-requests-stat-value">{stats.pending}</span>
            <span className="dashboard-requests-stat-label">Pending</span>
          </div>
          <div className="dashboard-requests-stat-card">
            <span className="dashboard-requests-stat-value">{stats.completed}</span>
            <span className="dashboard-requests-stat-label">Completed</span>
          </div>
          <div className="dashboard-requests-stat-card">
            <span className="dashboard-requests-stat-value">{stats.users}</span>
            <span className="dashboard-requests-stat-label">Users</span>
          </div>
        </div>
      )}

      <div className="dashboard-requests-toolbar">
        <form onSubmit={handleSearch} className="dashboard-requests-search">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or product URL..."
            className="dashboard-requests-search-input"
          />
          <button type="submit" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm">
            Search
          </button>
        </form>
        <div className="dashboard-requests-filters">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="dashboard-requests-filter-select"
          >
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="dashboard-requests-filter-select"
          >
            <option value="recent">Most recent</option>
            <option value="upvotes">Most upvotes</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="dashboard-requests-table-wrap">
        {loading ? (
          <p className="dashboard-empty">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="dashboard-empty">No requests yet.</p>
        ) : (
          <table className="dashboard-requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Upvotes</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="dashboard-requests-cell-id">{r.id}</td>
                  <td className="dashboard-requests-cell-title">{r.title || "—"}</td>
                  <td>
                    <span className={statusBadgeClass(r.status)}>{r.status}</span>
                  </td>
                  <td>{r.upvotes}</td>
                  <td className="dashboard-requests-cell-date">{formatDate(r.created_at)}</td>
                  <td>
                    <Link href={`/requests/request/${r.id}`} className="dashboard-requests-link">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="dashboard-requests-pagination">
          <button
            type="button"
            className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </button>
          <span className="dashboard-requests-pagination-info">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
