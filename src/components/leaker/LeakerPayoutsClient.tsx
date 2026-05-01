"use client";

import { useState } from "react";
import type { ScoredLeaker } from "@/lib/payout-scoring";

type SnapshotRow = {
  period: string;
  upload_count: number;
  total_downloads: number;
  total_views: number;
  total_filesize_bytes: number;
  total_price_value: number;
  raw_score: number | null;
  normalized_share: number | null;
  is_eligible: number;
  estimated_payout: number | null;
};

type Props = {
  currentPeriod: string;
  poolConfig: { total_pool?: number; mode?: "split" | "fixed"; fixed_amount?: number | null; min_uploads_required?: number };
  me: ScoredLeaker | null;
  history: SnapshotRow[];
  initialPaypalEmail: string;
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return "0.00";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return yyyymm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function LeakerPayoutsClient({ currentPeriod, poolConfig, me, history, initialPaypalEmail }: Props) {
  const [paypalEmail, setPaypalEmail] = useState(initialPaypalEmail);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const minUploads = poolConfig.min_uploads_required ?? 12;
  const uploads = me?.upload_count ?? 0;
  const isEligible = !!me?.is_eligible;
  const progress = Math.min(1, uploads / minUploads);
  const estimatedPayout = me?.estimated_payout ?? 0;
  const poolTotal = poolConfig.total_pool ?? 0;

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/leaker/payout-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypal_email: paypalEmail || null, payout_method: "paypal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, msg: data?.error || "Failed to save" });
      } else {
        setFeedback({ ok: true, msg: "Preferences saved." });
      }
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message || "Network error" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  const finalizedHistory = history.filter((h) => Number(h.is_eligible) === 1 && Number(h.estimated_payout || 0) > 0);

  return (
    <div className="leaker-payouts-page">
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="dash-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="bi bi-trophy-fill" style={{ color: "#fbbf24" }} /> My Payouts &amp; Stats
        </h1>
        <p className="dash-subtitle">Track your monthly resource uploads, potential earnings, and settings.</p>
      </div>

      {/* Current Month panel */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(220px, 1fr)", gap: 20, alignItems: "stretch" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Current Month: {periodLabel(currentPeriod)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#aaa", marginBottom: 6 }}>
              <span><i className="bi bi-activity" /> Your Uploads</span>
              <span style={{ color: "#fff" }}><strong>{uploads}</strong> / {minUploads} needed</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", background: isEligible ? "linear-gradient(90deg, #2dc770, #22c55e)" : "linear-gradient(90deg, #5865f2, #949cf7)" }} />
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: isEligible ? "rgba(45, 199, 112, 0.08)" : "rgba(250, 166, 26, 0.08)", border: `1px solid ${isEligible ? "rgba(45, 199, 112, 0.3)" : "rgba(250, 166, 26, 0.3)"}`, color: isEligible ? "#2dc770" : "#faa61a", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <i className={`bi ${isEligible ? "bi-check-circle-fill" : "bi-info-circle-fill"}`} />
              {isEligible
                ? "You\u2019re eligible for this month\u2019s payout pool."
                : `Upload ${minUploads - uploads} more resource${minUploads - uploads === 1 ? "" : "s"} to become eligible for this month\u2019s payout.`}
            </div>
          </div>

          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Estimated Payout</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#2dc770", lineHeight: 1 }}>${fmtMoney(estimatedPayout)}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>Shared from this month\u2019s ${fmtMoney(poolTotal)} payout pool.</div>
          </div>
        </div>
      </div>

      {/* Payout Settings + Security */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 20, marginBottom: 32 }}>
        <form onSubmit={savePreferences} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bi bi-gear-fill" style={{ color: "#949cf7" }} /> Payout Settings
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
            <MethodTile active label="PayPal" iconText="P" iconColor="#0070ba" />
            <MethodTile disabled label="Bank" iconClass="bi-bank2" />
            <MethodTile disabled label="Revolut" iconText="R" iconColor="#0666eb" />
            <MethodTile disabled label="Card" iconClass="bi-credit-card-2-front-fill" />
          </div>

          <label style={{ fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <i className="bi bi-envelope" /> PayPal Email
          </label>
          <input
            type="email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            placeholder="your.email@example.com"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: 14, marginBottom: 16 }}
          />

          {feedback && (
            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, fontSize: 12, background: feedback.ok ? "rgba(45, 199, 112, 0.1)" : "rgba(237, 66, 69, 0.1)", color: feedback.ok ? "#2dc770" : "#ed4245" }}>
              {feedback.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="dash-btn dash-btn-primary"
            style={{ width: "100%", padding: "12px 16px", justifyContent: "center", fontWeight: 700 }}
          >
            <i className="bi bi-save2" /> {saving ? "Saving\u2026" : "Save Preferences"}
          </button>
        </form>

        <div style={{ background: "rgba(250, 166, 26, 0.04)", border: "1px solid rgba(250, 166, 26, 0.2)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 32, color: "#faa61a", marginBottom: 14 }}>
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <h3 style={{ fontSize: 15, color: "#fff", marginBottom: 10, fontWeight: 700 }}>Payment Information Security</h3>
          <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5, margin: 0 }}>
            Your payment information is securely stored. Make sure all details are accurate. Incorrect details may
            lead to delayed or lost payouts. Payments are typically processed between the 1st and 5th of every month.
          </p>
        </div>
      </div>

      {/* Payout History */}
      <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <i className="bi bi-currency-dollar" style={{ color: "#fbbf24" }} /> Payout History
      </h2>

      {finalizedHistory.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, color: "#666", marginBottom: 12 }}>
            <i className="bi bi-file-earmark-check" />
          </div>
          <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>No Payout History</div>
          <p style={{ color: "#aaa", marginTop: 8, fontSize: 13 }}>
            Once you become eligible and receive payouts, they will appear here as stunning cards.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {finalizedHistory.map((h) => (
            <div key={h.period} style={{ background: "rgba(45, 199, 112, 0.04)", border: "1px solid rgba(45, 199, 112, 0.2)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, color: "#2dc770", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{periodLabel(h.period)}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 6 }}>${fmtMoney(h.estimated_payout)}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span>{h.upload_count} uploads</span>
                <span>{Number(h.total_downloads).toLocaleString()} dl</span>
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                {h.normalized_share != null ? `${(Number(h.normalized_share) * 100).toFixed(2)}% of pool` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MethodTile({ label, iconClass, iconText, iconColor, active, disabled }: {
  label: string;
  iconClass?: string;
  iconText?: string;
  iconColor?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      title={disabled ? "Coming soon" : label}
      style={{
        position: "relative",
        padding: "16px 8px",
        borderRadius: 12,
        background: active ? "rgba(88, 101, 242, 0.1)" : "rgba(255,255,255,0.03)",
        border: active ? "1px solid rgba(88, 101, 242, 0.4)" : "1px solid rgba(255,255,255,0.06)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "default",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {iconClass ? (
          <i className={`bi ${iconClass}`} style={{ fontSize: 22, color: iconColor || "#aaa" }} />
        ) : (
          <span style={{ width: 26, height: 26, borderRadius: 6, background: iconColor || "#444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{iconText}</span>
        )}
        <span style={{ fontSize: 12, color: active ? "#fff" : "#aaa", fontWeight: 600 }}>{label}</span>
      </div>
      {disabled && (
        <span style={{ position: "absolute", top: 4, right: 4, fontSize: 9, fontWeight: 700, color: "#888" }}>SOON</span>
      )}
    </div>
  );
}
