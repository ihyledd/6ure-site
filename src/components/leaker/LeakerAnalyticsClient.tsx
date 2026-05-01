"use client";

import { useState } from "react";

type MonthRow = {
  period: string;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  raw_score: number | null;
  estimated_payout: number | null;
  is_eligible: number;
};

type ResourceRow = {
  id: number;
  name: string;
  thumbnail_url: string | null;
  category: string | null;
  download_count: number;
  view_count: number;
  is_premium: number;
  leaked_at: string;
};

type Props = {
  lifetime: { count: number; downloads: number; views: number };
  monthlyCount: number;
  weeklyCount: number;
  dailyCount: number;
  monthHistory: MonthRow[];
  recent: ResourceRow[];
};

export function LeakerAnalyticsClient({ lifetime, monthlyCount, weeklyCount, dailyCount, monthHistory, recent }: Props) {
  const [activeMonth, setActiveMonth] = useState<string | null>(monthHistory[0]?.period || null);

  const stats = [
    { label: "Total Uploads", value: lifetime.count, icon: "bi-cloud-upload" },
    { label: "Total Downloads", value: lifetime.downloads.toLocaleString(), icon: "bi-download" },
    { label: "Total Views", value: lifetime.views.toLocaleString(), icon: "bi-eye" },
    { label: "Uploaded This Month", value: monthlyCount, icon: "bi-calendar-month" },
    { label: "Uploaded This Week", value: weeklyCount, icon: "bi-calendar-week" },
    { label: "Uploaded Today", value: dailyCount, icon: "bi-calendar-day" },
  ];

  const maxUploads = Math.max(1, ...monthHistory.map(m => m.upload_count));

  const eligibilityProgress = Math.min(1, monthlyCount / 12);

  // Resources for the active month
  const activeMonthResources = activeMonth
    ? recent.filter(r => r.leaked_at && r.leaked_at.startsWith(activeMonth))
    : recent;

  return (
    <div className="leaker-dashboard-analytics">
      <div className="dash-header" style={{ marginBottom: 32 }}>
        <h1 className="dash-title">Upload Analytics</h1>
        <p className="dash-subtitle">Detailed statistics, month-by-month performance, and progress toward payout.</p>
      </div>

      {/* Lifetime stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(88,101,242,0.1)", color: "#5865f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Eligibility progress */}
      <div style={{ background: "rgba(88,101,242,0.05)", border: "1px solid rgba(88,101,242,0.1)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, color: "#fff", margin: 0 }}>Payout eligibility (current month)</h2>
          <span style={{ fontSize: 13, color: "#949cf7", fontWeight: 600 }}>
            {monthlyCount} / 12 uploads
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
          <div style={{ width: `${eligibilityProgress * 100}%`, height: "100%", background: monthlyCount >= 12 ? "linear-gradient(90deg, #2dc770, #22c55e)" : "linear-gradient(90deg, #5865f2, #949cf7)", transition: "width 300ms ease" }} />
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: "#aaa" }}>
          {monthlyCount >= 12
            ? "You\u2019ve qualified for a payout this month."
            : `Upload ${12 - monthlyCount} more resource(s) this month to qualify.`}
        </p>
      </div>

      {/* Monthly bar chart */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 16 }}>Monthly performance</h2>
        {monthHistory.length === 0 ? (
          <p style={{ color: "#aaa" }}>No history yet — keep uploading!</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, marginBottom: 16, overflowX: "auto" }}>
              {[...monthHistory].reverse().map(m => {
                const heightPct = (m.upload_count / maxUploads) * 100;
                const isActive = activeMonth === m.period;
                return (
                  <button
                    key={m.period}
                    onClick={() => setActiveMonth(m.period)}
                    style={{
                      flex: 1, minWidth: 50, background: "none", border: "none", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#fff",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#aaa" }}>{m.upload_count}</span>
                    <div style={{
                      width: "100%", maxWidth: 40,
                      height: `${Math.max(heightPct, 3)}%`,
                      background: isActive ? "linear-gradient(180deg, #5865f2, #4854c5)" : "rgba(88,101,242,0.4)",
                      borderRadius: 6,
                      transition: "background 150ms",
                      boxShadow: m.is_eligible ? "0 0 0 2px rgba(45, 199, 112, 0.3)" : "none",
                    }} />
                    <span style={{ fontSize: 10, color: isActive ? "#fff" : "#aaa", fontWeight: isActive ? 700 : 400 }}>
                      {m.period}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeMonth && (() => {
              const sel = monthHistory.find(m => m.period === activeMonth);
              if (!sel) return null;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, padding: 16, background: "rgba(0,0,0,0.15)", borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Period</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{sel.period}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Uploads</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{sel.upload_count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Downloads</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{sel.total_downloads.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Views</div>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{sel.total_views.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Eligible</div>
                    <div style={{ fontSize: 14, color: sel.is_eligible ? "#2dc770" : "#aaa", fontWeight: 600 }}>{sel.is_eligible ? "Yes" : "No"}</div>
                  </div>
                  {sel.estimated_payout != null && (
                    <div>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Estimated payout</div>
                      <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{Number(sel.estimated_payout).toFixed(2)}</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Top resources */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 16 }}>Recent resources{activeMonth ? ` (${activeMonth})` : ""}</h2>
        {activeMonthResources.length === 0 ? (
          <p style={{ color: "#aaa" }}>No resources for this period.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {activeMonthResources.slice(0, 12).map(r => (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <img src={r.thumbnail_url || "/placeholder.png"} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{r.category}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#aaa" }}>
                  <span><i className="bi bi-download" /> {r.download_count}</span>
                  <span><i className="bi bi-eye" /> {r.view_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
