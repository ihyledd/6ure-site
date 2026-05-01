"use client";

import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/requests/UserAvatar";
import type { AdminUserRow } from "@/lib/dal/users";

type Props = {
  users: AdminUserRow[];
};

type SortKey = "activity" | "login";
type SortDir = "desc" | "asc";

const PAGE_SIZE = 20;

export function UsersAdminClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [sortBy, setSortBy] = useState<SortKey>("activity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Keep state in sync if parent supplies fresh data on hot reload.
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  async function toggleProtected(userId: string, isProtected: boolean) {
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [isProtected ? "removeTag" : "addTag"]: "protected" }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, tags: data.tags || [] } : u));
      }
    } finally {
      setSavingId(null);
    }
  }

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return formatter.format(d);
  };

  const sorted = useMemo(() => {
    const toTime = (iso: string | null) => (iso ? new Date(iso).getTime() || 0 : 0);
    const copy = [...users];
    copy.sort((a, b) => {
      const aTime =
        sortBy === "activity"
          ? toTime(a.lastActivityAt ?? a.lastLoginAt)
          : toTime(a.lastLoginAt);
      const bTime =
        sortBy === "activity"
          ? toTime(b.lastActivityAt ?? b.lastLoginAt)
          : toTime(b.lastLoginAt);
      if (aTime === bTime) return 0;
      return sortDir === "desc" ? bTime - aTime : aTime - bTime;
    });
    return copy;
  }, [users, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  if (users.length === 0) {
    return <p className="dashboard-empty">No users found.</p>;
  }

  return (
    <div className="dashboard-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {sorted.length.toLocaleString()} user{sorted.length === 1 ? "" : "s"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "var(--text-tertiary)" }}>Sort by:</span>
          <button
            type="button"
            className="requests-filter-tab"
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: sortBy === "activity" ? "var(--glass-bg)" : "transparent",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            onClick={() => {
              setSortBy("activity");
              setPage(1);
            }}
          >
            Last activity
          </button>
          <button
            type="button"
            className="requests-filter-tab"
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: sortBy === "login" ? "var(--glass-bg)" : "transparent",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
            onClick={() => {
              setSortBy("login");
              setPage(1);
            }}
          >
            Last login
          </button>
          <button
            type="button"
            className="requests-filter-tab"
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid var(--glass-border)",
            }}
            onClick={() => {
              setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              setPage(1);
            }}
            title={sortDir === "desc" ? "Newest first" : "Oldest first"}
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      <div className="dashboard-table users-table">
        <div className="dashboard-table-head">
          <div>User</div>
          <div>Discord handle</div>
          <div>Premium</div>
          <div>Boost</div>
          <div>Tags</div>
          <div>Last activity</div>
        </div>
        <div className="dashboard-table-body">
          {pageItems.map((u) => (
            <div key={u.id} className="dashboard-table-row">
              <div className="users-cell-main">
                <UserAvatar
                  avatar={u.guildAvatar ?? u.avatar ?? undefined}
                  userId={u.id}
                  avatarDecoration={null}
                  size={32}
                  displayName={u.guildNickname ?? u.globalName ?? u.displayName ?? u.username ?? u.id}
                />
                <div className="users-cell-text">
                  <div className="users-name">
                    {u.guildNickname ?? u.globalName ?? u.displayName ?? "Unknown"}
                  </div>
                  <div className="users-id">ID: {u.id}</div>
                </div>
              </div>
              <div className="users-cell-handle">
                {u.username ? `@${u.username}` : "—"}
              </div>
              <div>
                {u.patreonPremium ? (
                  <span className="dashboard-tag dashboard-tag-premium">Premium</span>
                ) : (
                  "—"
                )}
              </div>
              <div>{u.boostLevel > 0 ? `Level ${u.boostLevel}` : "—"}</div>
              <div>
                {(() => {
                  const isProtected = (u.tags || []).includes("protected");
                  return (
                    <button
                      type="button"
                      onClick={() => toggleProtected(u.id, isProtected)}
                      disabled={savingId === u.id}
                      title={isProtected ? "Remove protected tag" : "Add protected tag"}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 999,
                        background: isProtected ? "rgba(237, 66, 69, 0.15)" : "rgba(255,255,255,0.05)",
                        border: isProtected ? "1px solid rgba(237, 66, 69, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                        color: isProtected ? "#ed4245" : "#aaa",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      <i className="bi bi-shield-lock" /> {isProtected ? "PROTECTED" : "Add protected"}
                    </button>
                  );
                })()}
              </div>
              <div>{formatDate(u.lastActivityAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            fontSize: 13,
            color: "var(--text-secondary)",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="requests-filter-tab"
              style={{ padding: "4px 10px", borderRadius: 999, opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="requests-filter-tab"
              style={{ padding: "4px 10px", borderRadius: 999, opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

