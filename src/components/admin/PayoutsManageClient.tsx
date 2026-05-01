"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/requests/UserAvatar";

type ScoredLeaker = {
  user_id: string;
  user_name: string | null;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  total_filesize_bytes: number;
  total_price_value: number;
  score: number;
  normalized: number;
  estimated_payout: number;
  is_eligible: boolean;
  breakdown: { price: number; downloads: number; filesize: number; quantity: number; engagement: number };
};

type PoolRow = {
  period: string;
  total_pool: number;
  mode: "split" | "fixed";
  fixed_amount: number | null;
  min_uploads_required: number;
  finalized: boolean;
  notes: string | null;
};

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(n: number): string {
  if (!isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBytes(b: number): string {
  if (!b || b <= 0) return "0 B";
  if (b >= 1024 * 1024 * 1024) return (b / (1024 ** 3)).toFixed(1) + " GB";
  if (b >= 1024 * 1024) return (b / (1024 ** 2)).toFixed(1) + " MB";
  if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
  return `${b} B`;
}

export function PayoutsManageClient() {
  const [period, setPeriod] = useState<string>(thisMonth());
  const [items, setItems] = useState<ScoredLeaker[]>([]);
  const [pool, setPool] = useState<PoolRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Editable pool form
  const [poolDraft, setPoolDraft] = useState<{ total_pool: string; mode: "split" | "fixed"; fixed_amount: string; min_uploads_required: string; notes: string }>({
    total_pool: "0",
    mode: "split",
    fixed_amount: "",
    min_uploads_required: "12",
    notes: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts?period=${period}`);
      const data = await res.json();
      setItems(data.items || []);
      setPool(data.pool || null);
      setPoolDraft({
        total_pool: String(data.pool?.total_pool ?? 0),
        mode: (data.pool?.mode === "fixed" ? "fixed" : "split"),
        fixed_amount: data.pool?.fixed_amount != null ? String(data.pool.fixed_amount) : "",
        min_uploads_required: String(data.pool?.min_uploads_required ?? 12),
        notes: data.pool?.notes ?? "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  async function savePool() {
    setBusy("save");
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          total_pool: Number(poolDraft.total_pool) || 0,
          mode: poolDraft.mode,
          fixed_amount: poolDraft.mode === "fixed" ? Number(poolDraft.fixed_amount) || 0 : null,
          min_uploads_required: Number(poolDraft.min_uploads_required) || 12,
          notes: poolDraft.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to save pool");
      } else {
        load();
      }
    } finally { setBusy(null); }
  }

  async function snapshotNow() {
    if (!confirm(`Snapshot scores for ${period}?`)) return;
    setBusy("snapshot");
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, action: "snapshot" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data?.error || "Snapshot failed");
      else load();
    } finally { setBusy(null); }
  }

  async function finalize() {
    if (!confirm(`Finalize ${period}? This locks the payout distribution.`)) return;
    setBusy("finalize");
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, action: "finalize" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data?.error || "Finalize failed");
      else load();
    } finally { setBusy(null); }
  }

  function exportCsv() {
    const rows = [
      ["user_id", "user_name", "uploads", "downloads", "views", "filesize_bytes", "price_total", "score", "share", "estimated_payout", "eligible"],
      ...items.map(i => [
        i.user_id, i.user_name ?? "", i.upload_count, i.total_downloads, i.total_views,
        i.total_filesize_bytes, i.total_price_value.toFixed(2),
        i.score.toFixed(4), i.normalized.toFixed(6), i.estimated_payout.toFixed(2),
        i.is_eligible ? "yes" : "no",
      ]),
    ];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payouts-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const eligibleCount = items.filter(i => i.is_eligible).length;
  const totalEstPayout = items.reduce((acc, i) => acc + (i.estimated_payout || 0), 0);

  // Build options for last 12 months
  const monthOptions: string[] = [];
  {
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const ym = new Date(d.getFullYear(), d.getMonth() - i, 1).toISOString().slice(0, 7);
      monthOptions.push(ym);
    }
  }

  return (
    <div className="admin-resources-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Leaker Payouts</h1>
          <p className="dash-subtitle">Weighted scoring, pool management & payout estimates</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", minWidth: 160 }}
        >
          {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="dash-btn dash-btn-ghost" onClick={exportCsv} disabled={items.length === 0}>
          <i className="bi bi-download" /> Export CSV
        </button>
        <button className="dash-btn dash-btn-ghost" onClick={snapshotNow} disabled={busy !== null}>
          {busy === "snapshot" ? "Snapshotting…" : <><i className="bi bi-camera" /> Snapshot</>}
        </button>
        <button className="dash-btn" onClick={finalize} disabled={busy !== null || pool?.finalized} style={{ background: pool?.finalized ? "rgba(45, 199, 112, 0.15)" : "#5865f2", color: pool?.finalized ? "#2dc770" : "#fff", border: "none", padding: "8px 16px", borderRadius: 8 }}>
          {pool?.finalized ? "Finalized" : busy === "finalize" ? "Finalizing…" : "Finalize"}
        </button>
      </div>

      {/* Pool config editor */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 16 }}>Pool configuration ({period})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#aaa" }}>Mode</label>
            <select
              value={poolDraft.mode}
              onChange={(e) => setPoolDraft(d => ({ ...d, mode: e.target.value as "split" | "fixed" }))}
              style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6 }}
            >
              <option value="split">Split pool by score</option>
              <option value="fixed">Fixed amount per eligible leaker</option>
            </select>
          </div>
          {poolDraft.mode === "split" ? (
            <div>
              <label style={{ fontSize: 12, color: "#aaa" }}>Total pool</label>
              <input type="number" min={0} step="0.01" value={poolDraft.total_pool} onChange={(e) => setPoolDraft(d => ({ ...d, total_pool: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6 }} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 12, color: "#aaa" }}>Fixed amount per eligible leaker</label>
              <input type="number" min={0} step="0.01" value={poolDraft.fixed_amount} onChange={(e) => setPoolDraft(d => ({ ...d, fixed_amount: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6 }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: "#aaa" }}>Min uploads to qualify</label>
            <input type="number" min={0} value={poolDraft.min_uploads_required} onChange={(e) => setPoolDraft(d => ({ ...d, min_uploads_required: e.target.value }))} style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6 }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "#aaa" }}>Notes (optional)</label>
            <input type="text" value={poolDraft.notes} onChange={(e) => setPoolDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Anything to remember about this pool" style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none", marginTop: 6 }} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="dash-btn dash-btn-primary" onClick={savePool} disabled={busy !== null || pool?.finalized}>
            {busy === "save" ? "Saving…" : "Save pool"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        <SummaryCard label="Leakers" value={items.length} />
        <SummaryCard label="Eligible" value={eligibleCount} highlight />
        <SummaryCard label="Pool" value={pool ? formatCurrency(pool.total_pool) : "0.00"} />
        <SummaryCard label="Estimated paid out" value={formatCurrency(totalEstPayout)} />
      </div>

      <div className="dashboard-requests-table-wrap">
        <table className="dashboard-requests-table">
          <thead>
            <tr>
              <th>LEAKER</th>
              <th style={{ textAlign: "right" }}>UPLOADS</th>
              <th style={{ textAlign: "right" }}>DL</th>
              <th style={{ textAlign: "right" }}>VIEWS</th>
              <th style={{ textAlign: "right" }}>SIZE</th>
              <th style={{ textAlign: "right" }}>PRICE TOTAL</th>
              <th style={{ textAlign: "right" }}>SCORE</th>
              <th style={{ textAlign: "right" }}>SHARE</th>
              <th style={{ textAlign: "right" }}>EST. PAYOUT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 40 }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "#888" }}>No leakers for this period.</td></tr>
            ) : items.map(i => (
              <tr key={i.user_id} style={i.is_eligible ? {} : { opacity: 0.5 }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <UserAvatar userId={i.user_id} avatar={null} displayName={i.user_name} size={28} />
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>{i.user_name || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{i.user_id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: "right", color: "#fff" }}>{i.upload_count}</td>
                <td style={{ textAlign: "right", color: "#aaa" }}>{i.total_downloads.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: "#aaa" }}>{i.total_views.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: "#aaa" }}>{formatBytes(i.total_filesize_bytes)}</td>
                <td style={{ textAlign: "right", color: "#aaa" }}>{formatCurrency(i.total_price_value)}</td>
                <td style={{ textAlign: "right", color: "#fff", fontWeight: 600 }}>{i.score.toFixed(4)}</td>
                <td style={{ textAlign: "right", color: "#aaa" }}>{(i.normalized * 100).toFixed(2)}%</td>
                <td style={{ textAlign: "right", color: "#fff", fontWeight: 700 }}>{formatCurrency(i.estimated_payout)}</td>
                <td>
                  {i.is_eligible ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(45, 199, 112, 0.1)", color: "#2dc770", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      <i className="bi bi-star-fill" style={{ fontSize: 10 }} /> ELIGIBLE
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(255,255,255,0.05)", color: "#888", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      {(pool?.min_uploads_required ?? 12) - i.upload_count} TO GO
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? "rgba(88,101,242,0.05)" : "rgba(255,255,255,0.03)", border: highlight ? "1px solid rgba(88,101,242,0.1)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 13, color: highlight ? "#949cf7" : "#aaa", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? "#949cf7" : "#fff" }}>{value}</div>
    </div>
  );
}
