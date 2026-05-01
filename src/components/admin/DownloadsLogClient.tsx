"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/requests/UserAvatar";

type DownloadLog = {
  id: number;
  resource_id: number;
  user_id: string;
  user_name: string;
  ip_address: string;
  downloaded_at: string;
  resource_name: string | null;
  resource_editor: string | null;
  user_avatar: string | null;
  user_global_name: string | null;
  user_display_name: string | null;
  user_nick: string | null;
  patreon_premium: number | boolean | null;
  leak_protection: number | boolean | null;
};

export function DownloadsLogClient() {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchType, setSearchType] = useState("all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs();
  }, [page, debouncedSearch, searchType]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/downloads?page=${page}&limit=50&search=${encodeURIComponent(debouncedSearch)}&searchType=${searchType}`);
      const data = await res.json();
      if (data.items) {
        setLogs(data.items);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-resources-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Download Logs</h1>
          <p className="dash-subtitle">Monitor resource access and downloads</p>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", maxWidth: 700 }}>
        <div className="requests-search-wrap" style={{ position: "relative", flex: 1, minWidth: 300 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
          <input 
            type="text" 
            className="requests-search-input" 
            style={{ paddingLeft: 44, width: "100%", height: 48, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
            placeholder={
              searchType === "user" ? "Search Discord ID or Username..." :
              searchType === "ip" ? "Search IP Address..." :
              searchType === "resource" ? "Search Resource or Handle..." :
              "Search All Fields..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="requests-search-input" 
          style={{ width: "auto", minWidth: 160, appearance: "auto", height: 48, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", padding: "0 12px" }}
          value={searchType}
          onChange={(e) => { setSearchType(e.target.value); setPage(1); }}
        >
          <option value="all">Search All</option>
          <option value="user">User (ID/Name)</option>
          <option value="ip">IP Address</option>
          <option value="resource">Resource/Editor</option>
        </select>
      </div>

      <div className="dashboard-requests-table-wrap">
        <table className="dashboard-requests-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>RESOURCE</th>
              <th>USER</th>
              <th style={{ textAlign: "right" }}>IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 40 }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 40, color: "#888" }}>No download logs found.</td></tr>
             ) : logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 13, color: "#aaa" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>{new Date(log.downloaded_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{new Date(log.downloaded_at).toLocaleTimeString()}</span>
                  </div>
                </td>
                <td>
                  <Link href={`/resources/${log.resource_id}`} className="log-resource-link" style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ fontWeight: 700, color: "var(--discord-blurple)", fontSize: 14, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      {log.resource_name || "Unknown Resource"}
                      <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10, opacity: 0.5 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>{log.resource_editor}</div>
                  </Link>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <UserAvatar userId={log.user_id} avatar={log.user_avatar} displayName={log.user_name} size={32} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, color: "#ddd", fontWeight: 600 }}>{log.user_nick || log.user_display_name || log.user_name}</span>
                        {!!log.patreon_premium && (
                          <span style={{ 
                            fontSize: 9, 
                            fontWeight: 800, 
                            color: "#000", 
                            background: "linear-gradient(45deg, #fbbf24, #f59e0b)", 
                            padding: "1px 6px", 
                            borderRadius: 4, 
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            boxShadow: "0 0 10px rgba(251, 191, 36, 0.2)"
                          }} title="Patreon Premium">
                            <i className="bi bi-star-fill" style={{ fontSize: 8 }} />
                            PREMIUM
                          </span>
                        )}
                        {!!log.leak_protection && (
                          <span style={{ 
                            fontSize: 9, 
                            fontWeight: 800, 
                            color: "#fff", 
                            background: "linear-gradient(45deg, #7c9082, #5a6b5e)", 
                            padding: "1px 6px", 
                            borderRadius: 4, 
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            boxShadow: "0 0 10px rgba(124, 144, 130, 0.2)"
                          }} title="Leak Protection">
                            <i className="bi bi-shield-check" style={{ fontSize: 8 }} />
                            PROTECTED
                          </span>
                        )}
                        {log.user_global_name && (
                          <span style={{ fontSize: 11, color: "var(--discord-blurple)", opacity: 0.8 }}>@{log.user_global_name}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "#666" }}>{log.user_id}</span>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "#666", fontFamily: "monospace", textAlign: "right" }}>
                  {log.ip_address}
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 40, paddingBottom: 40 }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            style={{ 
              padding: "10px 20px", 
              background: page === 1 ? "rgba(255,255,255,0.02)" : "rgba(88, 101, 242, 0.1)", 
              border: "1px solid rgba(88, 101, 242, 0.2)",
              color: page === 1 ? "#666" : "var(--discord-blurple)", 
              borderRadius: 10, 
              cursor: page === 1 ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.2s"
            }}
          >
            <i className="bi bi-chevron-left" style={{ marginRight: 8 }} />
            Previous
          </button>
          
          <div style={{ color: "#aaa", fontSize: 14, fontWeight: 500, background: "rgba(255,255,255,0.03)", padding: "8px 16px", borderRadius: 8 }}>
            Page <span style={{ color: "#fff" }}>{page}</span> of {totalPages}
          </div>

          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            style={{ 
              padding: "10px 20px", 
              background: page === totalPages ? "rgba(255,255,255,0.02)" : "rgba(88, 101, 242, 0.1)", 
              border: "1px solid rgba(88, 101, 242, 0.2)",
              color: page === totalPages ? "#666" : "var(--discord-blurple)", 
              borderRadius: 10, 
              cursor: page === totalPages ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.2s"
            }}
          >
            Next
            <i className="bi bi-chevron-right" style={{ marginLeft: 8 }} />
          </button>
        </div>
      )}
    </div>
  );
}
