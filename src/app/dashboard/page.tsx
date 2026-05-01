import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { queryOne, query } from "@/lib/db";

export const metadata = {
  title: "Leaker Dashboard | Helix",
};

export default async function LeakerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?callbackUrl=/dashboard");
  
  // Basic stats for the leaker
  const stats = await queryOne<{ count: number; downloads: number }>(`
    SELECT COUNT(*) as count, SUM(download_count) as downloads
    FROM resources_items
    WHERE discord_member_id = ?
  `, [session.user.id]);

  const recentUploads = await query(`
    SELECT name, leaked_at, download_count
    FROM resources_items
    WHERE discord_member_id = ?
    ORDER BY leaked_at DESC
    LIMIT 5
  `, [session.user.id]);

  const leakCount = stats?.count || 0;
  const isEligible = leakCount >= 12;

  return (
    <div className="leaker-dashboard-overview">
      <div className="dash-header" style={{ marginBottom: 32 }}>
        <h1 className="dash-title">Welcome back, {session.user.name}</h1>
        <p className="dash-subtitle">Track your performance and manage your uploads</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 40 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 14, color: "#aaa", marginBottom: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Uploads</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{leakCount}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.min((leakCount / 12) * 100, 100)}%`, height: "100%", background: isEligible ? "#2dc770" : "#5865f2" }} />
            </div>
            <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>{leakCount}/12</span>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 14, color: "#aaa", marginBottom: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Downloads</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{(stats?.downloads || 0).toLocaleString()}</div>
          <div style={{ fontSize: 13, color: "#2dc770", fontWeight: 600 }}>
            <i className="bi bi-graph-up-arrow" /> Performance looks great!
          </div>
        </div>

        <div style={{ background: "rgba(88,101,242,0.05)", border: "1px solid rgba(88,101,242,0.1)", borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 14, color: "#949cf7", marginBottom: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Tip</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Keep it fresh!
          </div>
          <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>
            Regular uploads keep your audience engaged and boost your download metrics. Aim for at least one leak per week.
          </p>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Recent Uploads</h2>
          <button style={{ background: "none", border: "none", color: "#5865f2", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>View All</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.01)" }}>
              <th style={{ padding: "12px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Resource</th>
              <th style={{ padding: "12px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Downloads</th>
              <th style={{ padding: "12px 24px", fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentUploads.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: "#666" }}>No uploads yet.</td></tr>
            ) : recentUploads.map((leak: any, i) => (
              <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "16px 24px", fontSize: 14, fontWeight: 500, color: "#fff" }}>{leak.name}</td>
                <td style={{ padding: "16px 24px", fontSize: 14, color: "#aaa" }}>{leak.download_count}</td>
                <td style={{ padding: "16px 24px", fontSize: 14, color: "#666" }}>{new Date(leak.leaked_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
