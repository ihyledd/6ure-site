"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import "@/styles/subscriptions-dashboard.css";
import { RevenueRefundSplitBar, useCountUp, UsersGroupIcon } from "@/components/admin/SubscriptionsDashShared";

type Subscription = {
  id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  email: string | null;
  created_at: string;
};

type Stats = { totalActive: number; totalRevenue: number; totalRefunded: number; mrr: number; premiumActive: number; lpActive: number; totalCancelled: number };
type Toast = { id: number; message: string; type: "success" | "error" };
let toastId = 0;

const glass = "background: radial-gradient(circle at 20% 50%, rgba(88,101,242,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(114,137,218,0.05) 0%, transparent 50%), color-mix(in srgb, var(--bg-secondary) 88%, var(--bg-primary)); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--glass-border, rgba(255,255,255,0.06)); border-radius: 16px; box-shadow: var(--glass-shadow, 0 4px 24px rgba(0,0,0,0.08));";

function GlassCard({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={{ ...cssFromString(glass), padding: 24, marginBottom: 0, ...style }}>{children}</div>;
}

function cssFromString(s: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const rule of s.split(";")) {
    const [k, ...v] = rule.split(":");
    if (k && v.length) {
      const key = k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = v.join(":").trim();
    }
  }
  return out as unknown as React.CSSProperties;
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [premiumRoleId, setPremiumRoleId] = useState("");
  const [lpRoleId, setLpRoleId] = useState("");
  const [rolesSaving, setRolesSaving] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  const [showReconcile, setShowReconcile] = useState(false);
  const [reconcileId, setReconcileId] = useState("");
  const [reconcileType, setReconcileType] = useState<"subscription" | "order">("subscription");
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ success: boolean; message: string; username?: string; paymentCreated?: boolean; amount?: number } | null>(null);
  const [bulkSyncProcessing, setBulkSyncProcessing] = useState(false);

  const PAGE_SIZE = 20;

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/admin/analytics").then(r => r.json()).then(d => setStats(d)).catch(() => {});
    fetch("/api/site-settings/subscription-roles").then(r => r.json()).then(d => {
      if (d.premiumRoleId) setPremiumRoleId(d.premiumRoleId);
      if (d.lpRoleId) setLpRoleId(d.lpRoleId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchSubs() {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        if (filter !== "ALL") q.append("status", filter);
        if (search) q.append("search", search);
        q.append("limit", String(PAGE_SIZE));
        q.append("offset", String(page * PAGE_SIZE));
        const res = await fetch(`/api/admin/subscriptions?${q}`);
        const data = await res.json();
        if (res.ok) { setSubs(data.rows || []); setTotal(data.total || 0); }
      } catch { /* */ } finally { setLoading(false); }
    }
    const t = setTimeout(fetchSubs, 300);
    return () => clearTimeout(t);
  }, [filter, search, page]);

  useEffect(() => { setPage(0); }, [filter, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const n = (v: unknown) => Number(v) || 0;

  const activeN = stats ? n(stats.totalActive) : 0;
  const revenueN = stats ? n(stats.totalRevenue) : 0;
  const mrrN = stats ? n(stats.mrr) : 0;
  const cancelledN = stats ? n(stats.totalCancelled) : 0;
  const refundedN = stats ? n(stats.totalRefunded) : 0;
  const activeDisplay = useCountUp(activeN, { duration: 850 });
  const revenueDisplay = useCountUp(revenueN, { duration: 950, decimals: 2 });
  const mrrDisplay = useCountUp(mrrN, { duration: 950, decimals: 2 });
  const cancelledDisplay = useCountUp(cancelledN, { duration: 850 });

  const handleSaveRoles = async () => {
    setRolesSaving(true);
    try {
      const res = await fetch("/api/site-settings/subscription-roles", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premiumRoleId, lpRoleId }),
      });
      addToast(res.ok ? "Discord role IDs saved" : "Failed to save", res.ok ? "success" : "error");
    } catch { addToast("Failed to save", "error"); } finally { setRolesSaving(false); }
  };

  const handleExportCsv = () => {
    if (!subs.length) return;
    const header = "ID,User ID,Username,Plan,Interval,Status,Amount,Email,Created\n";
    const rows = subs.map(s => `${s.id},${s.user_id},"${s.username}",${s.plan_category},${s.plan_interval},${s.status},${s.amount},"${s.email ?? ""}",${s.created_at}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    addToast(`Exported ${subs.length} subscriptions`, "success");
  };

  const handleReconcile = async () => {
    if (!reconcileId.trim()) return;
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await fetch("/api/admin/subscriptions/reconcile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalId: reconcileId.trim(), type: reconcileType }),
      });
      const data = await res.json();
      if (res.ok) {
        setReconcileResult({ success: true, message: data.message || "Subscription created", username: data.username, paymentCreated: data.paymentCreated, amount: data.amount });
        addToast(data.message || "Subscription reconciled", "success");
        setReconcileId("");
      } else {
        setReconcileResult({ success: false, message: data.error || "Failed" });
        addToast(data.error || "Reconciliation failed", "error");
      }
    } catch { addToast("Reconciliation failed", "error"); } finally { setReconciling(false); }
  };
  
  const handleBulkSync = async () => {
    if (!confirm("This will attempt to assign Discord roles to ALL active/unexpired subscribers. It may take a minute. Continue?")) return;
    setBulkSyncProcessing(true);
    try {
      const res = await fetch("/api/admin/subscriptions/bulk-sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || "Bulk sync completed", "success");
      } else {
        addToast(data.error || "Bulk sync failed", "error");
      }
    } catch {
      addToast("Bulk sync failed", "error");
    } finally {
      setBulkSyncProcessing(false);
    }
  };

  const badge = (status: string) => {
    const c: Record<string, string> = {
      ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
      CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
      PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      EXPIRED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      SUSPENDED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium border ${c[status] || c.EXPIRED}`}>{status}</span>;
  };

  return (
    <div className="dashboard-wide subs-dash">
      {/* Toasts */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: "12px 20px", borderRadius: 10, background: t.type === "success" ? "rgba(87,242,135,0.12)" : "rgba(237,66,69,0.12)", border: `1px solid ${t.type === "success" ? "rgba(87,242,135,0.25)" : "rgba(237,66,69,0.25)"}`, color: t.type === "success" ? "#57F287" : "#f87171", fontSize: 14, fontWeight: 500, backdropFilter: "blur(12px)", animation: "fadeIn 0.3s ease" }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="subs-dash-header">
        <div className="subs-dash-title-block">
          <h1>Subscriptions</h1>
          <p>Manage user payments, Discord roles, and premium access — synced with PayPal webhooks.</p>
        </div>
        <div className="subs-dash-actions">
          <div className="subs-live-pill" title="Webhook-driven updates">
            <span className="subs-live-dot" />
            Live sync
          </div>
          <button onClick={() => setShowReconcile(!showReconcile)} style={{ padding: "8px 16px", background: showReconcile ? "rgba(250,166,26,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: showReconcile ? "#FAA61A" : "#b9bbbe", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Reconcile
          </button>
          <button 
            onClick={handleBulkSync} 
            disabled={bulkSyncProcessing}
            style={{ 
              padding: "8px 16px", 
              background: "rgba(168,85,247,0.15)", 
              border: "1px solid rgba(168,85,247,0.3)", 
              borderRadius: 8, 
              color: "#c084fc", 
              fontSize: 13, 
              fontWeight: 600, 
              cursor: "pointer",
              opacity: bulkSyncProcessing ? 0.6 : 1
            }}
          >
            {bulkSyncProcessing ? "Syncing..." : "Bulk Sync Roles"}
          </button>
          <button onClick={() => setShowRoles(!showRoles)} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#b9bbbe", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Discord Roles
          </button>
          <button onClick={handleExportCsv} disabled={!subs.length} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#b9bbbe", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: subs.length ? 1 : 0.4 }}>
            Export CSV
          </button>
          <Link href="/admin/subscriptions/promo-codes" style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#b9bbbe", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Promo Codes
          </Link>
          <Link href="/admin/subscriptions/analytics" style={{ padding: "8px 16px", background: "rgba(88,101,242,0.8)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Analytics
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <>
          <div className="subs-kpi-grid">
            {[
              {
                label: "ACTIVE",
                display: activeDisplay,
                color: "#57F287",
                icon: <UsersGroupIcon color="#57F287" size={18} />,
                meta: "Paying subscriptions",
              },
              {
                label: "REVENUE",
                display: `$${revenueDisplay}`,
                color: "#5865f2",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
                meta: "Net after refunds",
                refund: refundedN,
              },
              {
                label: "MRR",
                display: `$${mrrDisplay}`,
                color: "#FAA61A",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAA61A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4l-10 10.01L9 11.01" />
                  </svg>
                ),
                meta: "Estimated monthly",
              },
              {
                label: "CHURNED",
                display: cancelledDisplay,
                color: "#ED4245",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ED4245" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ),
                meta: "All-time cancelled",
              },
            ].map((s, idx) => (
              <div key={s.label} className="subs-kpi-card subs-kpi-enter" style={{ animationDelay: `${idx * 0.06}s` }}>
                <div className="subs-kpi-card-inner">
                  <div className="subs-kpi-label-row">
                    <span className="subs-kpi-label">{s.label}</span>
                    <div className="subs-kpi-icon-wrap" style={{ background: `${s.color}18` }}>
                      {s.icon}
                    </div>
                  </div>
                  <div className="subs-kpi-value" style={{ color: s.color }}>
                    {s.display}
                  </div>
                  {"refund" in s && s.refund != null && s.refund > 0 && <div className="subs-kpi-refund">-${s.refund.toFixed(2)} refunded</div>}
                  <div className="subs-kpi-meta">{s.meta}</div>
                </div>
              </div>
            ))}
          </div>
          <RevenueRefundSplitBar totalRevenue={revenueN} totalRefunded={refundedN} />
        </>
      )}

      {/* Reconcile panel */}
      {showReconcile && (
        <GlassCard style={{ marginBottom: 24, borderColor: "rgba(250,166,26,0.15)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>Reconcile Missing Subscription</h3>
          <p style={{ fontSize: 13, color: "#72767d", margin: "0 0 16px" }}>Enter a PayPal subscription or order ID to verify with PayPal and create the missing DB record.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Type</label>
              <select value={reconcileType} onChange={e => setReconcileType(e.target.value as "subscription" | "order")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }}>
                <option value="subscription">Subscription (I-XXXX)</option>
                <option value="order">Order (one-time)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>PayPal ID</label>
              <input value={reconcileId} onChange={e => setReconcileId(e.target.value)} placeholder="e.g. I-VFKT6JUSV62E or 5XX..." style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
            </div>
            <button onClick={handleReconcile} disabled={reconciling || !reconcileId.trim()} style={{ padding: "8px 20px", background: "#FAA61A", color: "#111", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: reconciling ? 0.6 : 1, whiteSpace: "nowrap" }}>
              {reconciling ? "Verifying..." : "Reconcile"}
            </button>
          </div>
          {reconcileResult && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: reconcileResult.success ? "rgba(87,242,135,0.08)" : "rgba(237,66,69,0.08)", border: `1px solid ${reconcileResult.success ? "rgba(87,242,135,0.2)" : "rgba(237,66,69,0.2)"}`, color: reconcileResult.success ? "#57F287" : "#f87171", fontSize: 13 }}>
              <div>{reconcileResult.message}{reconcileResult.username && ` — @${reconcileResult.username}`}</div>
              {reconcileResult.success && reconcileResult.paymentCreated && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  Payment recorded: ${Number(reconcileResult.amount || 0).toFixed(2)} — revenue updated
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Discord roles panel */}
      {showRoles && (
        <GlassCard style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>Discord Role IDs</h3>
          <p style={{ fontSize: 12, color: "#72767d", margin: "0 0 16px" }}>Assigned when a subscription activates. Saved to DB (overrides env vars).</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Premium Role ID</label>
              <input value={premiumRoleId} onChange={e => setPremiumRoleId(e.target.value)} placeholder="e.g. 123456789012345678" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Leak Protection Role ID</label>
              <input value={lpRoleId} onChange={e => setLpRoleId(e.target.value)} placeholder="e.g. 123456789012345678" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
            </div>
          </div>
          <button onClick={handleSaveRoles} disabled={rolesSaving} style={{ padding: "8px 20px", background: "rgba(88,101,242,0.8)", color: "#fff", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: rolesSaving ? 0.6 : 1 }}>
            {rolesSaving ? "Saving..." : "Save Role IDs"}
          </button>
        </GlassCard>
      )}

      {/* Filter bar */}
      <div className="subs-toolbar">
        <input
          type="text"
          placeholder="Search username or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="subs-search"
        />
        <div className="subs-filter-pills">
          {["ALL", "ACTIVE", "CANCELLED", "PENDING", "EXPIRED"].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`subs-filter-pill${filter === f ? " is-active" : ""}`}
            >
              {f === "ALL" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="subs-table-wrap">
        <table className="subs-table">
          <thead>
            <tr>
              {["User", "Plan", "Status", "Amount", "Created", "Actions"].map(h => (
                <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#72767d" }}>Loading...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#72767d" }}>No subscriptions found.</td></tr>
            ) : subs.map(sub => (
              <tr key={sub.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {sub.avatar ? <img src={sub.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#5865f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{sub.username?.charAt(0).toUpperCase() || "?"}</div>}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{sub.username}</div>
                      <div style={{ fontSize: 11, color: "#72767d" }}>{sub.user_id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{sub.plan_category.replace("_", " ")}</div>
                  <div style={{ fontSize: 11, color: "#72767d" }}>{sub.plan_interval}</div>
                </td>
                <td>{badge(sub.status)}</td>
                <td style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>${n(sub.amount).toFixed(2)}</td>
                <td style={{ fontSize: 13, color: "#b9bbbe" }}>{formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/admin/subscriptions/${sub.id}`} className="subs-table-link">View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: "#72767d" }}>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.04)", color: "#b9bbbe", border: "none", cursor: "pointer", opacity: page === 0 ? 0.4 : 1 }}>Previous</button>
            <span style={{ fontSize: 13, color: "#72767d" }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.04)", color: "#b9bbbe", border: "none", cursor: "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
