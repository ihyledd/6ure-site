"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/* ---- Inline styles for the subscription admin ---- */
const S = {
  tabs: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" as const },
  tab: (a: boolean) => ({ padding: "10px 20px", borderRadius: 10, border: "1px solid", borderColor: a ? "#a855f7" : "#2a2a3a", background: a ? "rgba(168,85,247,0.12)" : "transparent", color: a ? "#c084fc" : "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" as const }),
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 },
  statCard: { background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 14, padding: "20px 24px" },
  statLabel: { fontSize: "0.75rem", color: "#888", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 },
  statValue: { fontSize: "1.6rem", fontWeight: 800, color: "#fff" },
  statChange: (g: number) => ({ fontSize: "0.78rem", fontWeight: 600, color: g > 0 ? "#4ade80" : g < 0 ? "#f87171" : "#888", marginTop: 4 }),
  searchRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" as const },
  input: { padding: "10px 16px", border: "1px solid #2a2a3a", borderRadius: 10, background: "#15151e", color: "#fff", fontSize: "0.88rem", outline: "none", flex: 1, minWidth: 200 },
  filterBtn: (a: boolean) => ({ padding: "8px 14px", borderRadius: 8, border: "1px solid", borderColor: a ? "#a855f7" : "#2a2a3a", background: a ? "rgba(168,85,247,0.12)" : "transparent", color: a ? "#c084fc" : "#888", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" as const }),
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#666", borderBottom: "1px solid #2a2a3a" },
  td: { padding: "10px 12px", fontSize: "0.88rem", color: "#ccc", borderBottom: "1px solid #1e1e2e" },
  statusBadge: (s: string) => ({ fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: s === "ACTIVE" ? "rgba(74,222,128,0.12)" : s === "CANCELLED" ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.12)", color: s === "ACTIVE" ? "#4ade80" : s === "CANCELLED" ? "#f87171" : "#fbbf24" }),
  actionBtn: { padding: "6px 12px", borderRadius: 6, border: "1px solid #2a2a3a", background: "transparent", color: "#ccc", fontSize: "0.78rem", cursor: "pointer" as const, marginRight: 4 },
  dangerBtn: { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: "0.78rem", cursor: "pointer" as const },
  pagRow: { display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginTop: 16 },
  live: { display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#4ade80", marginLeft: "auto" },
  liveDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" },
  promoCard: { background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 14, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 12 },
  promoForm: { background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 14, padding: 24, marginBottom: 24 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 },
  formLabel: { display: "block", fontSize: "0.75rem", color: "#888", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  formInput: { width: "100%", padding: "10px 14px", border: "1px solid #2a2a3a", borderRadius: 8, background: "#15151e", color: "#fff", fontSize: "0.88rem", outline: "none" },
  createBtn: { padding: "10px 24px", background: "linear-gradient(135deg, #a855f7, #6c5ce7)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" as const },
  activityItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e1e2e" },
  activityDot: (type: string) => ({ width: 8, height: 8, borderRadius: "50%", background: type === "payment" ? "#4ade80" : "#a855f7", flexShrink: 0 }),
  refundOverlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  refundModal: { background: "#15151e", border: "1px solid #2a2a3a", borderRadius: 16, maxWidth: 420, width: "90vw", padding: 32 },
  chartSvg: { width: "100%", height: 220 },
} as const;

type Tab = "overview" | "subscriptions" | "analytics" | "promo";

interface Analytics {
  summary: { totalRevenue: number; totalRefunded: number; netRevenue: number; activeSubscribers: number; activePremium: number; activeLeakProtection: number };
  periods: { today: number; yesterday: number; todayGrowth: number; week: number; lastWeek: number; weekGrowth: number; month: number; lastMonth: number; monthGrowth: number; year: number };
  charts: { revenue: Array<{ period: string; revenue: string; count: number }>; revenueByPlan: Array<{ plan_category: string; plan_interval: string; total: string }> };
  recentActivity: Array<{ type: string; id: string; amount: string; status: string; created_at: string; plan_category: string; plan_interval: string; username: string }>;
}

interface SubRow {
  id: string; user_id: string; plan_category: string; plan_interval: string; status: string;
  amount: string; email: string | null; payer_name: string | null; username: string | null;
  global_name: string | null; display_name: string | null; avatar: string | null;
  guild_avatar: string | null; guild_nickname: string | null; created_at: string;
  instructions_sent_at: string | null; payment_count: number; total_paid: string | null;
}

interface PromoCode {
  id: string; code: string; discount_percent: number; max_uses: number | null;
  used_count: number; plan_category: string | null; active: boolean; valid_until: string | null;
}

export function SubscriptionsAdmin() {
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
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try { const r = await fetch(`/api/admin/analytics?range=${chartRange}`); if (r.ok) setAnalytics(await r.json()); } catch {}
  }, [chartRange]);

  const fetchSubs = useCallback(async () => {
    const p = new URLSearchParams({ page: String(subsPage), limit: "15" });
    if (subsSearch) p.set("search", subsSearch); if (subsFilter) p.set("status", subsFilter);
    try { const r = await fetch(`/api/admin/subscriptions?${p}`); if (r.ok) { const d = await r.json(); setSubs(d.subscriptions); setSubsTotal(d.total); } } catch {}
  }, [subsPage, subsSearch, subsFilter]);

  const fetchPromos = useCallback(async () => {
    try { const r = await fetch("/api/admin/promo-codes"); if (r.ok) { const d = await r.json(); setPromoCodes(d.codes); } } catch {}
  }, []);

  useEffect(() => { fetchAnalytics(); refreshRef.current = setInterval(fetchAnalytics, 30000); return () => { if (refreshRef.current) clearInterval(refreshRef.current); }; }, [fetchAnalytics]);
  useEffect(() => { if (tab === "subscriptions") fetchSubs(); }, [tab, fetchSubs]);
  useEffect(() => { if (tab === "promo") fetchPromos(); }, [tab, fetchPromos]);

  const handleRefund = async () => {
    if (!refundModal) return; setProcessing(true);
    try {
      const r = await fetch(`/api/admin/payments/${refundModal.paymentId}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: refundAmount ? parseFloat(refundAmount) : undefined, reason: refundReason || undefined }) });
      const d = await r.json(); if (d.success) { setRefundModal(null); fetchSubs(); fetchAnalytics(); alert(d.message); } else alert(d.error || "Refund failed");
    } catch { alert("Error processing refund"); } finally { setProcessing(false); }
  };

  const sendInstructions = async (subId: string) => {
    try { const r = await fetch(`/api/admin/subscriptions/${subId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_instructions" }) }); const d = await r.json(); alert(d.message || d.error); if (d.success) fetchSubs(); } catch { alert("Failed"); }
  };

  const adminCancel = async (subId: string) => {
    if (!confirm("Cancel this subscription?")) return;
    try { const r = await fetch(`/api/admin/subscriptions/${subId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", reason: "Cancelled by admin" }) }); const d = await r.json(); alert(d.message || d.error); if (d.success) fetchSubs(); } catch { alert("Failed"); }
  };

  const createPromo = async () => {
    if (!newPromo.code || !newPromo.discountPercent) return;
    try { const r = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newPromo.code, discountPercent: parseInt(newPromo.discountPercent), maxUses: newPromo.maxUses ? parseInt(newPromo.maxUses) : undefined, planCategory: newPromo.planCategory || undefined }) });
      const d = await r.json(); if (d.success) { setNewPromo({ code: "", discountPercent: "10", maxUses: "", planCategory: "" }); fetchPromos(); } else alert(d.error);
    } catch { alert("Failed"); }
  };

  const a = analytics;
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const gLabel = (g: number) => g > 0 ? `↑ ${g}%` : g < 0 ? `↓ ${Math.abs(g)}%` : "—";

  return (
    <div>
      <div className="dashboard-section-header">
        <h2>Subscriptions</h2>
        <p>Manage PayPal subscriptions, view analytics, and create promo codes.</p>
      </div>

      <div style={S.tabs}>
        {(["overview", "subscriptions", "analytics", "promo"] as Tab[]).map((t) => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : t === "subscriptions" ? "List" : t === "analytics" ? "Analytics" : "Promo Codes"}
          </button>
        ))}
        <div style={S.live}><div style={S.liveDot as React.CSSProperties} /> Live</div>
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && a && (
        <>
          <div style={S.statsGrid}>
            <div style={S.statCard}><div style={S.statLabel}>Total Revenue</div><div style={S.statValue}>{fmt(a.summary.totalRevenue)}</div><div style={S.statChange(0)}>Net: {fmt(a.summary.netRevenue)}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>Active Subscribers</div><div style={S.statValue}>{a.summary.activeSubscribers}</div><div style={S.statChange(0)}>Premium: {a.summary.activePremium} · LP: {a.summary.activeLeakProtection}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>This Month</div><div style={S.statValue}>{fmt(a.periods.month)}</div><div style={S.statChange(a.periods.monthGrowth)}>{gLabel(a.periods.monthGrowth)} vs last month</div></div>
            <div style={S.statCard}><div style={S.statLabel}>Today</div><div style={S.statValue}>{fmt(a.periods.today)}</div><div style={S.statChange(a.periods.todayGrowth)}>{gLabel(a.periods.todayGrowth)} vs yesterday</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
            <div style={{ ...S.statCard, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>Revenue</h3>
                <div style={{ display: "flex", gap: 4 }}>{["7d","30d","90d","1y"].map(r => <button key={r} style={S.filterBtn(chartRange===r)} onClick={() => setChartRange(r)}>{r}</button>)}</div>
              </div>
              <RevenueChart data={a.charts.revenue} />
            </div>
            <div style={S.statCard}>
              <h3 style={{ margin: "0 0 12px", color: "#fff", fontSize: "1rem" }}>Recent Activity</h3>
              {a.recentActivity.length === 0 ? <p style={{ color: "#888", fontSize: "0.85rem" }}>No activity yet.</p> :
                a.recentActivity.slice(0, 8).map((item, i) => (
                  <div key={i} style={S.activityItem}><div style={S.activityDot(item.type) as React.CSSProperties} />
                    <span style={{ flex: 1, fontSize: "0.82rem", color: "#ccc" }}><strong style={{ color: "#fff" }}>{item.username ?? "User"}</strong> {item.type === "payment" ? `paid $${parseFloat(item.amount).toFixed(2)}` : item.status.toLowerCase()} {item.plan_category === "PREMIUM" ? "Premium" : "LP"}</span>
                    <span style={{ fontSize: "0.72rem", color: "#666" }}>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>))}
            </div>
          </div>
        </>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === "subscriptions" && (
        <>
          <div style={S.searchRow}><input style={S.input} placeholder="Search by username, email..." value={subsSearch} onChange={e => { setSubsSearch(e.target.value); setSubsPage(1); }} /></div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>{["","ACTIVE","CANCELLED","PENDING","SUSPENDED"].map(f => <button key={f} style={S.filterBtn(subsFilter===f)} onClick={() => { setSubsFilter(f); setSubsPage(1); }}>{f||"All"}</button>)}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead><tr><th style={S.th}>User</th><th style={S.th}>Plan</th><th style={S.th}>Status</th><th style={S.th}>Amount</th><th style={S.th}>Email</th><th style={S.th}>Date</th><th style={S.th}>Actions</th></tr></thead>
              <tbody>{subs.map(sub => {
                const name = sub.guild_nickname ?? sub.global_name ?? sub.display_name ?? sub.username ?? "Unknown";
                return (
                  <tr key={sub.id}>
                    <td style={S.td}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>{sub.avatar && <img style={{ width: 24, height: 24, borderRadius: "50%" }} src={`https://cdn.discordapp.com/avatars/${sub.user_id}/${sub.guild_avatar ?? sub.avatar}.webp?size=64`} alt="" />}<span>{name}</span></div></td>
                    <td style={S.td}>{sub.plan_category === "PREMIUM" ? "Premium" : "LP"} {sub.plan_interval.charAt(0)+sub.plan_interval.slice(1).toLowerCase()}</td>
                    <td style={S.td}><span style={S.statusBadge(sub.status)}>{sub.status}</span></td>
                    <td style={S.td}>${parseFloat(sub.amount).toFixed(2)}</td>
                    <td style={{ ...S.td, fontSize: "0.78rem" }}>{sub.email||"—"}</td>
                    <td style={S.td}>{new Date(sub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td style={S.td}>
                      {sub.status==="ACTIVE" && <>
                        {sub.plan_category==="LEAK_PROTECTION" && !sub.instructions_sent_at && <button style={S.actionBtn} onClick={() => sendInstructions(sub.id)}>Instructions</button>}
                        <button style={S.dangerBtn} onClick={() => adminCancel(sub.id)}>Cancel</button>
                      </>}
                    </td>
                  </tr>);
              })}</tbody>
            </table>
          </div>
          {subsTotal > 15 && <div style={S.pagRow}><button style={S.actionBtn} disabled={subsPage<=1} onClick={() => setSubsPage(p => p-1)}>← Prev</button><span style={{ color: "#888", fontSize: "0.82rem" }}>Page {subsPage} / {Math.ceil(subsTotal/15)}</span><button style={S.actionBtn} disabled={subsPage >= Math.ceil(subsTotal/15)} onClick={() => setSubsPage(p => p+1)}>Next →</button></div>}
        </>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && a && (
        <>
          <div style={S.statsGrid}>
            <div style={S.statCard}><div style={S.statLabel}>Today</div><div style={S.statValue}>{fmt(a.periods.today)}</div><div style={S.statChange(a.periods.todayGrowth)}>{gLabel(a.periods.todayGrowth)}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>This Week</div><div style={S.statValue}>{fmt(a.periods.week)}</div><div style={S.statChange(a.periods.weekGrowth)}>{gLabel(a.periods.weekGrowth)}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>This Month</div><div style={S.statValue}>{fmt(a.periods.month)}</div><div style={S.statChange(a.periods.monthGrowth)}>{gLabel(a.periods.monthGrowth)}</div></div>
            <div style={S.statCard}><div style={S.statLabel}>This Year</div><div style={S.statValue}>{fmt(a.periods.year)}</div></div>
          </div>
          <div style={{ ...S.statCard, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>Revenue Over Time</h3>
              <div style={{ display: "flex", gap: 4 }}>{["7d","30d","90d","1y"].map(r => <button key={r} style={S.filterBtn(chartRange===r)} onClick={() => setChartRange(r)}>{r}</button>)}</div>
            </div>
            <RevenueChart data={a.charts.revenue} />
          </div>
          <div style={{ ...S.statsGrid, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {a.charts.revenueByPlan.map((bp, i) => <div key={i} style={S.statCard}><div style={S.statLabel}>{bp.plan_category==="PREMIUM"?"Premium":"LP"} {bp.plan_interval.charAt(0)+bp.plan_interval.slice(1).toLowerCase()}</div><div style={S.statValue}>{fmt(parseFloat(bp.total))}</div></div>)}
          </div>
        </>
      )}

      {/* PROMO CODES */}
      {tab === "promo" && (
        <>
          <div style={S.promoForm}>
            <h3 style={{ color: "#fff", margin: "0 0 16px" }}>Create Promo Code</h3>
            <div style={S.formGrid}>
              <div><div style={S.formLabel}>Code</div><input style={S.formInput} value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} placeholder="WELCOME50" /></div>
              <div><div style={S.formLabel}>Discount %</div><input style={S.formInput} type="number" value={newPromo.discountPercent} onChange={e => setNewPromo({...newPromo, discountPercent: e.target.value})} min="1" max="100" /></div>
              <div><div style={S.formLabel}>Max Uses</div><input style={S.formInput} type="number" value={newPromo.maxUses} onChange={e => setNewPromo({...newPromo, maxUses: e.target.value})} placeholder="Unlimited" /></div>
              <div><div style={S.formLabel}>Plan</div><select style={S.formInput} value={newPromo.planCategory} onChange={e => setNewPromo({...newPromo, planCategory: e.target.value})}><option value="">All Plans</option><option value="PREMIUM">Premium</option><option value="LEAK_PROTECTION">Leak Protection</option></select></div>
            </div>
            <button style={S.createBtn} onClick={createPromo}>Create Code</button>
          </div>
          {promoCodes.map(pc => (
            <div key={pc.id} style={S.promoCard}>
              <div><span style={{ fontWeight: 700, color: "#fff", letterSpacing: "0.04em", marginRight: 12 }}>{pc.code}</span><span style={{ color: "#a855f7", fontWeight: 600 }}>{pc.discount_percent}% off</span></div>
              <div style={{ fontSize: "0.82rem", color: "#888" }}>Used: {pc.used_count}{pc.max_uses ? `/${pc.max_uses}` : ""} · {pc.plan_category || "All"} · {pc.active ? "🟢" : "⚫"}</div>
            </div>
          ))}
          {promoCodes.length === 0 && <p style={{ color: "#888" }}>No promo codes yet.</p>}
        </>
      )}

      {/* REFUND MODAL */}
      {refundModal && (
        <div style={S.refundOverlay} onClick={() => setRefundModal(null)}>
          <div style={S.refundModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", margin: "0 0 12px" }}>Issue Refund</h3>
            <p style={{ color: "#888", marginBottom: 16 }}>Original: ${refundModal.amount}</p>
            <input style={{ ...S.formInput, marginBottom: 12 }} type="number" placeholder={`Full refund: $${refundModal.amount}`} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
            <input style={{ ...S.formInput, marginBottom: 20 }} placeholder="Reason (optional)" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.actionBtn} onClick={() => setRefundModal(null)}>Cancel</button>
              <button style={S.dangerBtn} onClick={handleRefund} disabled={processing}>{processing ? "Processing..." : "Confirm Refund"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- SVG Revenue Chart ---- */
function RevenueChart({ data }: { data: Array<{ period: string; revenue: string; count: number }> }) {
  if (!data || data.length === 0) return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>No data yet</div>;
  const vals = data.map(d => parseFloat(d.revenue));
  const max = Math.max(...vals, 1);
  const pad = { t: 20, r: 20, b: 40, l: 60 };
  const w = 800, h = 220;
  const cW = w - pad.l - pad.r, cH = h - pad.t - pad.b;
  const pts = vals.map((v, i) => ({ x: pad.l + (i / Math.max(vals.length - 1, 1)) * cW, y: pad.t + cH - (v / max) * cH }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length-1].x},${pad.t+cH} L${pts[0].x},${pad.t+cH} Z`;
  const gridN = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 200 }} preserveAspectRatio="none">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" /><stop offset="100%" stopColor="#a855f7" stopOpacity="0" /></linearGradient></defs>
      {Array.from({ length: gridN + 1 }, (_, i) => { const val = (max / gridN) * i; const y = pad.t + cH - (val / max) * cH; return <g key={i}><line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#2a2a3a" strokeWidth="1" /><text x={pad.l - 8} y={y + 4} textAnchor="end" fill="#666" fontSize="10">${val.toFixed(0)}</text></g>; })}
      <path d={area} fill="url(#cg)" /><path d={line} fill="none" stroke="#a855f7" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#a855f7" />)}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0 || i === data.length - 1).map((d) => { const idx = data.indexOf(d); const x = pad.l + (idx / Math.max(data.length - 1, 1)) * cW; return <text key={idx} x={x} y={h - 8} textAnchor="middle" fill="#666" fontSize="10">{d.period.length > 7 ? d.period.slice(5) : d.period}</text>; })}
    </svg>
  );
}
