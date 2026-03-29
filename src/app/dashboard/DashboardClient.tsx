"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import "@/styles/dashboard.css";

/* ---- Types ---- */
interface Analytics {
  summary: {
    totalRevenue: number;
    totalRefunded: number;
    netRevenue: number;
    activeSubscribers: number;
    activePremium: number;
    activeLeakProtection: number;
  };
  periods: {
    today: number;
    yesterday: number;
    todayGrowth: number;
    week: number;
    lastWeek: number;
    weekGrowth: number;
    month: number;
    lastMonth: number;
    monthGrowth: number;
    year: number;
  };
  charts: {
    revenue: Array<{ period: string; revenue: string; count: number }>;
    subscribers: Array<{ period: string; new_subs: number; cancellations: number }>;
    revenueByPlan: Array<{ plan_category: string; plan_interval: string; total: string }>;
  };
  recentActivity: Array<{
    type: string;
    id: string;
    amount: string;
    status: string;
    created_at: string;
    plan_category: string;
    plan_interval: string;
    username: string;
  }>;
}

interface SubRow {
  id: string;
  user_id: string;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  email: string | null;
  payer_name: string | null;
  username: string | null;
  global_name: string | null;
  display_name: string | null;
  avatar: string | null;
  guild_avatar: string | null;
  created_at: string;
  instructions_sent_at: string | null;
  payment_count: number;
  total_paid: string | null;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  plan_category: string | null;
  active: boolean;
  total_uses: number;
}

type Tab = "overview" | "subscriptions" | "analytics" | "promo";

export function DashboardClient() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chartRange, setChartRange] = useState("30d");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsPage, setSubsPage] = useState(1);
  const [subsSearch, setSubsSearch] = useState("");
  const [subsFilter, setSubsFilter] = useState("");
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [refundModal, setRefundModal] = useState<{ paymentId: string; amount: string } | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", discountPercent: "10", maxUses: "", planCategory: "" });
  const refreshRef = useRef<ReturnType<typeof setInterval>>();

  const isDev = (session?.user as { is_developer?: boolean })?.is_developer ?? false;

  // ---- Fetch analytics ----
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${chartRange}`);
      if (res.ok) setAnalytics(await res.json());
    } catch {}
  }, [chartRange]);

  // ---- Fetch subscriptions ----
  const fetchSubs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(subsPage), limit: "15" });
    if (subsSearch) params.set("search", subsSearch);
    if (subsFilter) params.set("status", subsFilter);
    try {
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions);
        setSubsTotal(data.total);
      }
    } catch {}
  }, [subsPage, subsSearch, subsFilter]);

  // ---- Fetch promo codes ----
  const fetchPromos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data.codes);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isDev) return;
    fetchAnalytics();
    // Auto-refresh every 30s
    refreshRef.current = setInterval(fetchAnalytics, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [isDev, fetchAnalytics]);

  useEffect(() => {
    if (isDev && tab === "subscriptions") fetchSubs();
  }, [isDev, tab, fetchSubs]);

  useEffect(() => {
    if (isDev && tab === "promo") fetchPromos();
  }, [isDev, tab, fetchPromos]);

  // ---- Refund handler ----
  const handleRefund = async () => {
    if (!refundModal) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/payments/${refundModal.paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
          reason: refundReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundModal(null);
        fetchSubs();
        fetchAnalytics();
        alert(data.message);
      } else {
        alert(data.error || "Refund failed");
      }
    } catch {
      alert("Error processing refund");
    } finally {
      setProcessing(false);
    }
  };

  // ---- Send instructions ----
  const sendInstructions = async (subId: string) => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_instructions" }),
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (data.success) fetchSubs();
    } catch {
      alert("Failed to send instructions");
    }
  };

  // ---- Cancel subscription (admin) ----
  const adminCancel = async (subId: string) => {
    if (!confirm("Cancel this subscription?")) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "Cancelled by admin" }),
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (data.success) fetchSubs();
    } catch {
      alert("Failed to cancel");
    }
  };

  // ---- Create promo ----
  const createPromo = async () => {
    if (!newPromo.code || !newPromo.discountPercent) return;
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newPromo.code,
          discountPercent: parseInt(newPromo.discountPercent),
          maxUses: newPromo.maxUses ? parseInt(newPromo.maxUses) : undefined,
          planCategory: newPromo.planCategory || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewPromo({ code: "", discountPercent: "10", maxUses: "", planCategory: "" });
        fetchPromos();
      } else {
        alert(data.error);
      }
    } catch {
      alert("Failed to create code");
    }
  };

  if (!isDev) {
    return <div className="dashboard-page"><p style={{ color: "#f87171" }}>Access denied. Developer only.</p></div>;
  }

  const a = analytics;
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const growthLabel = (g: number) => g > 0 ? `↑ ${g}%` : g < 0 ? `↓ ${Math.abs(g)}%` : "—";
  const growthClass = (g: number) => g > 0 ? "positive" : g < 0 ? "negative" : "neutral";

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>

      <div className="dashboard-tabs">
        {(["overview", "subscriptions", "analytics", "promo"] as Tab[]).map((t) => (
          <button key={t} className={`dashboard-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : t === "subscriptions" ? "Subscriptions" : t === "analytics" ? "Analytics" : "Promo Codes"}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <span className="live-indicator"><span className="live-dot" /> Live</span>
        </div>
      </div>

      {/* ====== OVERVIEW ====== */}
      {tab === "overview" && a && (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-card-label">Total Revenue</div>
              <div className="stat-card-value">{fmt(a.summary.totalRevenue)}</div>
              <div className="stat-card-change neutral">Net: {fmt(a.summary.netRevenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Active Subscribers</div>
              <div className="stat-card-value">{a.summary.activeSubscribers}</div>
              <div className="stat-card-change neutral">
                Premium: {a.summary.activePremium} · LP: {a.summary.activeLeakProtection}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">This Month</div>
              <div className="stat-card-value">{fmt(a.periods.month)}</div>
              <div className={`stat-card-change ${growthClass(a.periods.monthGrowth)}`}>
                {growthLabel(a.periods.monthGrowth)} vs last month
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Today</div>
              <div className="stat-card-value">{fmt(a.periods.today)}</div>
              <div className={`stat-card-change ${growthClass(a.periods.todayGrowth)}`}>
                {growthLabel(a.periods.todayGrowth)} vs yesterday
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
            {/* Revenue chart */}
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Revenue</h3>
                <div className="chart-range-btns">
                  {["7d", "30d", "90d", "1y"].map((r) => (
                    <button key={r} className={`chart-range-btn ${chartRange === r ? "active" : ""}`} onClick={() => setChartRange(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-container">
                <RevenueChart data={a.charts.revenue} />
              </div>
            </div>

            {/* Activity feed */}
            <div className="activity-feed">
              <h3>Recent Activity</h3>
              {a.recentActivity.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No activity yet.</p>
              ) : (
                a.recentActivity.slice(0, 8).map((item, i) => {
                  const planName = item.plan_category === "PREMIUM" ? "Premium" : "LP";
                  const dateStr = new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div className="activity-item" key={i}>
                      <span className={`activity-dot ${item.type === "payment" ? "payment" : "subscription"}`} />
                      <span className="activity-text">
                        <strong>{item.username ?? "User"}</strong>{" "}
                        {item.type === "payment" ? `paid $${parseFloat(item.amount).toFixed(2)}` : `${item.status.toLowerCase()}`}{" "}
                        {planName}
                      </span>
                      <span className="activity-time">{dateStr}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ====== SUBSCRIPTIONS ====== */}
      {tab === "subscriptions" && (
        <div className="dashboard-table-card">
          <div className="dashboard-table-header">
            <h3>All Subscriptions ({subsTotal})</h3>
            <input
              className="dashboard-search"
              placeholder="Search by username, email..."
              value={subsSearch}
              onChange={(e) => { setSubsSearch(e.target.value); setSubsPage(1); }}
            />
          </div>
          <div className="dashboard-filters">
            {["", "ACTIVE", "CANCELLED", "PENDING", "SUSPENDED"].map((f) => (
              <button
                key={f}
                className={`dashboard-filter-btn ${subsFilter === f ? "active" : ""}`}
                onClick={() => { setSubsFilter(f); setSubsPage(1); }}
              >
                {f || "All"}
              </button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const name = sub.guild_nickname ?? sub.global_name ?? sub.display_name ?? sub.username ?? "Unknown";
                  const avatarUrl = sub.guild_avatar ?? sub.avatar
                    ? `https://cdn.discordapp.com/avatars/${sub.user_id}/${sub.guild_avatar ?? sub.avatar}.webp?size=64`
                    : undefined;
                  const planLabel = sub.plan_category === "PREMIUM" ? "Premium" : "LP";
                  const intervalLabel = sub.plan_interval.charAt(0) + sub.plan_interval.slice(1).toLowerCase();

                  return (
                    <tr key={sub.id}>
                      <td>
                        <div className="dashboard-table-user">
                          {avatarUrl ? (
                            <img className="dashboard-table-avatar" src={avatarUrl} alt="" />
                          ) : (
                            <div className="dashboard-table-avatar" />
                          )}
                          <span className="dashboard-table-username">{name}</span>
                        </div>
                      </td>
                      <td>{planLabel} {intervalLabel}</td>
                      <td><span className={`table-status ${sub.status.toLowerCase()}`}>{sub.status}</span></td>
                      <td>${parseFloat(sub.amount).toFixed(2)}</td>
                      <td style={{ fontSize: "0.8rem" }}>{sub.email || "—"}</td>
                      <td>{new Date(sub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>
                        <div className="table-actions">
                          {sub.status === "ACTIVE" && (
                            <>
                              {sub.plan_category === "LEAK_PROTECTION" && !sub.instructions_sent_at && (
                                <button className="table-action-btn" onClick={() => sendInstructions(sub.id)}>
                                  Send Instructions
                                </button>
                              )}
                              <button className="table-action-btn danger" onClick={() => adminCancel(sub.id)}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {subsTotal > 15 && (
            <div className="dashboard-pagination">
              <button className="dashboard-page-btn" disabled={subsPage <= 1} onClick={() => setSubsPage((p) => p - 1)}>
                ← Prev
              </button>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Page {subsPage} of {Math.ceil(subsTotal / 15)}
              </span>
              <button className="dashboard-page-btn" disabled={subsPage >= Math.ceil(subsTotal / 15)} onClick={() => setSubsPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ====== ANALYTICS ====== */}
      {tab === "analytics" && a && (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-card-label">Today</div>
              <div className="stat-card-value">{fmt(a.periods.today)}</div>
              <div className={`stat-card-change ${growthClass(a.periods.todayGrowth)}`}>
                {growthLabel(a.periods.todayGrowth)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">This Week</div>
              <div className="stat-card-value">{fmt(a.periods.week)}</div>
              <div className={`stat-card-change ${growthClass(a.periods.weekGrowth)}`}>
                {growthLabel(a.periods.weekGrowth)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">This Month</div>
              <div className="stat-card-value">{fmt(a.periods.month)}</div>
              <div className={`stat-card-change ${growthClass(a.periods.monthGrowth)}`}>
                {growthLabel(a.periods.monthGrowth)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">This Year</div>
              <div className="stat-card-value">{fmt(a.periods.year)}</div>
            </div>
          </div>

          <div className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3>Revenue Over Time</h3>
              <div className="chart-range-btns">
                {["7d", "30d", "90d", "1y"].map((r) => (
                  <button key={r} className={`chart-range-btn ${chartRange === r ? "active" : ""}`} onClick={() => setChartRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-container">
              <RevenueChart data={a.charts.revenue} />
            </div>
          </div>

          {/* Revenue by plan */}
          <div className="dashboard-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {a.charts.revenueByPlan.map((bp, i) => {
              const planName = bp.plan_category === "PREMIUM" ? "Premium" : "Leak Protection";
              const interval = bp.plan_interval.charAt(0) + bp.plan_interval.slice(1).toLowerCase();
              return (
                <div className="stat-card" key={i}>
                  <div className="stat-card-label">{planName} {interval}</div>
                  <div className="stat-card-value">{fmt(parseFloat(bp.total))}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ====== PROMO CODES ====== */}
      {tab === "promo" && (
        <>
          <div className="promo-create-form">
            <h3>Create Promo Code</h3>
            <div className="promo-form-grid">
              <div className="promo-form-field">
                <label>Code</label>
                <input
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                  placeholder="WELCOME50"
                />
              </div>
              <div className="promo-form-field">
                <label>Discount %</label>
                <input
                  type="number"
                  value={newPromo.discountPercent}
                  onChange={(e) => setNewPromo({ ...newPromo, discountPercent: e.target.value })}
                  min="1"
                  max="100"
                />
              </div>
              <div className="promo-form-field">
                <label>Max Uses (optional)</label>
                <input
                  type="number"
                  value={newPromo.maxUses}
                  onChange={(e) => setNewPromo({ ...newPromo, maxUses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="promo-form-field">
                <label>Plan (optional)</label>
                <select value={newPromo.planCategory} onChange={(e) => setNewPromo({ ...newPromo, planCategory: e.target.value })}>
                  <option value="">All Plans</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="LEAK_PROTECTION">Leak Protection</option>
                </select>
              </div>
            </div>
            <button
              className="table-action-btn"
              style={{ background: "linear-gradient(135deg, #a855f7, #6c5ce7)", color: "#fff", padding: "10px 24px", border: "none" }}
              onClick={createPromo}
            >
              Create Code
            </button>
          </div>

          <div className="promo-cards">
            {promoCodes.map((pc) => (
              <div className="promo-card" key={pc.id}>
                <div className="promo-card-header">
                  <span className="promo-card-code">{pc.code}</span>
                  <span className="promo-card-discount">{pc.discount_percent}% off</span>
                </div>
                <div className="promo-card-details">
                  <div>Used: {pc.used_count}{pc.max_uses ? ` / ${pc.max_uses}` : ""}</div>
                  <div>Plan: {pc.plan_category || "All"}</div>
                  <div>Status: {pc.active ? "🟢 Active" : "⚫ Inactive"}</div>
                  {pc.valid_until && <div>Expires: {new Date(pc.valid_until).toLocaleDateString()}</div>}
                </div>
              </div>
            ))}
            {promoCodes.length === 0 && (
              <p style={{ color: "var(--text-secondary)", gridColumn: "1 / -1" }}>No promo codes yet. Create one above!</p>
            )}
          </div>
        </>
      )}

      {/* ---- Refund modal ---- */}
      {refundModal && (
        <div className="refund-modal-overlay" onClick={() => setRefundModal(null)}>
          <div className="refund-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Issue Refund</h3>
            <p>Original amount: ${refundModal.amount}</p>
            <input
              className="refund-input"
              type="number"
              placeholder={`Full refund: $${refundModal.amount}`}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <input
              className="refund-input"
              placeholder="Reason (optional)"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="refund-modal-actions">
              <button className="table-action-btn" onClick={() => setRefundModal(null)}>Cancel</button>
              <button
                className="table-action-btn danger"
                style={{ background: "rgba(248,113,113,0.15)" }}
                onClick={handleRefund}
                disabled={processing}
              >
                {processing ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  SVG Revenue Chart (no external library)                            */
/* ================================================================== */

function RevenueChart({ data }: { data: Array<{ period: string; revenue: string; count: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>
        No data yet
      </div>
    );
  }

  const values = data.map((d) => parseFloat(d.revenue));
  const maxVal = Math.max(...values, 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const w = 800;
  const h = 280;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const points = values.map((v, i) => ({
    x: padding.left + (i / Math.max(values.length - 1, 1)) * chartW,
    y: padding.top + chartH - (v / maxVal) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  // Grid lines
  const gridLines = 4;
  const gridLabelValues = Array.from({ length: gridLines + 1 }, (_, i) => (maxVal / gridLines) * i);

  // X labels (show max 10)
  const labelStep = Math.max(1, Math.floor(data.length / 10));
  const xLabels = data.filter((_, i) => i % labelStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLabelValues.map((val, i) => {
        const y = padding.top + chartH - (val / maxVal) * chartH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} className="chart-grid-line" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="chart-label">
              ${val.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Area + Line */}
      <path d={areaPath} fill="url(#chartGradient)" />
      <path d={linePath} className="chart-line" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} className="chart-dot" />
      ))}

      {/* X labels */}
      {xLabels.map((d, i) => {
        const idx = data.indexOf(d);
        const x = padding.left + (idx / Math.max(data.length - 1, 1)) * chartW;
        const label = d.period.length > 7 ? d.period.slice(5) : d.period;
        return (
          <text key={i} x={x} y={h - 8} textAnchor="middle" className="chart-label">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
