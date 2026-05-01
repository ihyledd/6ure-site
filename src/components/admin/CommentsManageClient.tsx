"use client";

import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/requests/UserAvatar";
import Link from "next/link";

type CommentLog = {
  id: number;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  body: string;
  created_at: string;
  target_id: number;
  target_title: string | null;
  type: "request" | "resource";
};

export function CommentsManageClient() {
  const [comments, setComments] = useState<CommentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<"all" | "request" | "resource">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, debouncedSearch]);

  async function fetchComments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (type !== "all") params.set("type", type);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/comments?${params}`);
      const data = await res.json();
      if (data.items) {
        setComments(data.items);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(c: CommentLog) {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/admin/comments?id=${c.id}&type=${c.type}`, { method: "DELETE" });
      if (res.ok) {
        setComments(prev => prev.filter(x => !(x.id === c.id && x.type === c.type)));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function targetHref(c: CommentLog): string {
    return c.type === "resource" ? `/resources/${c.target_id}` : `/requests/${c.target_id}`;
  }

  return (
    <div className="admin-resources-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Global Comments</h1>
          <p className="dash-subtitle">Moderate request comments and resource comments in one place</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
          {(["all", "request", "resource"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              style={{
                padding: "8px 16px",
                background: type === t ? "var(--discord-blurple)" : "transparent",
                color: type === t ? "#fff" : "#aaa",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {t === "all" ? "All" : `${t}s`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search content or user..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", fontSize: 13 }}
        />
      </div>

      <div className="dashboard-requests-table-wrap">
        <table className="dashboard-requests-table">
          <thead>
            <tr>
              <th style={{ width: "15%" }}>USER</th>
              <th style={{ width: "45%" }}>COMMENT</th>
              <th style={{ width: "10%" }}>TYPE</th>
              <th style={{ width: "20%" }}>TARGET</th>
              <th style={{ width: "10%", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40 }}>Loading...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#888" }}>No comments found.</td></tr>
            ) : comments.map(comment => (
              <tr key={`${comment.type}-${comment.id}`}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UserAvatar userId={comment.user_id} avatar={comment.user_avatar} displayName={comment.user_name} size={28} />
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>{comment.user_name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{new Date(comment.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ color: "#ddd", fontSize: 14, lineHeight: "1.4", wordBreak: "break-word" }}>
                    {comment.body}
                  </div>
                </td>
                <td>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: comment.type === "resource" ? "rgba(88,101,242,0.15)" : "rgba(45,199,112,0.15)",
                    color: comment.type === "resource" ? "#949cf7" : "#2dc770",
                    textTransform: "uppercase",
                  }}>
                    {comment.type}
                  </span>
                </td>
                <td>
                  <Link href={targetHref(comment)} target="_blank" style={{ color: "#949cf7", fontSize: 12, textDecoration: "none" }}>
                    {comment.target_title || `${comment.type} #${comment.target_id}`}
                  </Link>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => handleDelete(comment)}
                    className="dash-icon-btn"
                    style={{ color: "#ed4245" }}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ display: "flex", alignItems: "center", color: "#aaa", fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", borderRadius: 8, cursor: page === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
