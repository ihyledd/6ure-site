"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { format } from "date-fns";
import "@/styles/subscriptions-dashboard.css";
import {
  AnalyticsRevenueChart,
  AnalyticsSubscriptionMixChart,
  type AnalyticsSeriesRow,
} from "@/components/dashboard/SubscriptionAnalyticsCharts";
import { RevenueRefundSplitBar, useCountUp, UsersGroupIcon } from "@/components/dashboard/SubscriptionsDashShared";

type Stats = {
  totalActive: number;
  totalRevenue: number;
  totalRefunded: number;
  mrr: number;
  premiumActive: number;
  lpActive: number;
  totalCancelled: number;
  series?: AnalyticsSeriesRow[];
};

type KpiDef = {
  label: string;
  color: string;
  sub: string;
  icon: React.ReactNode;
  refund?: number;
};

const n = (v: unknown) => Number(v) || 0;

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalActive = stats ? n(stats.totalActive) : 0;
  const totalRevenue = stats ? n(stats.totalRevenue) : 0;
  const totalRefunded = stats ? n(stats.totalRefunded) : 0;
  const mrr = stats ? n(stats.mrr) : 0;
  const premiumActive = stats ? n(stats.premiumActive) : 0;
  const lpActive = stats ? n(stats.lpActive) : 0;
  const totalCancelled = stats ? n(stats.totalCancelled) : 0;

  const revenueDisplay = useCountUp(totalRevenue, { duration: 1000, decimals: 2 });
  const mrrDisplay = useCountUp(mrr, { duration: 1000, decimals: 2 });
  const activeDisplay = useCountUp(totalActive, { duration: 900 });
  const churnDisplay = useCountUp(totalCancelled, { duration: 900 });

  const pctPremium = totalActive > 0 ? (premiumActive / totalActive) * 100 : 0;
  const pctLp = totalActive > 0 ? (lpActive / totalActive) * 100 : 0;

  if (loading) {
    return (
      <div className="dashboard-wide subs-dash" style={{ padding: 24, color: "#b9bbbe" }}>
        Loading analytics…
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="dashboard-wide subs-dash" style={{ padding: 24, color: "#ED4245" }}>
        Failed to load analytics
      </div>
    );
  }

  const kpis: KpiDef[] = [
    {
      label: "TOTAL REVENUE",
      color: "#57F287",
      sub: "Net revenue after refunds",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57F287" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      refund: totalRefunded,
    },
    {
      label: "MONTHLY RECURRING",
      color: "#5865f2",
      sub: "Estimated MRR from active subs",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4l-10 10.01L9 11.01" />
        </svg>
      ),
    },
    {
      label: "ACTIVE SUBSCRIBERS",
      color: "#9b59b6",
      sub: "Currently active subscriptions",
      icon: <UsersGroupIcon color="#9b59b6" size={18} />,
    },
    {
      label: "CHURNED",
      color: "#ED4245",
      sub: "Total cancelled subscriptions",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ED4245" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      ),
    },
  ];

  const displays = [`$${revenueDisplay}`, `$${mrrDisplay}`, activeDisplay, churnDisplay];

  return (
    <div className="dashboard-wide subs-dash">
      <div className="subs-dash-header" style={{ marginBottom: 24 }}>
        <div className="subs-dash-title-block">
          <h1>Subscription analytics</h1>
          <p>High-level revenue, mix, and health — styled for quick scanning.</p>
        </div>
        <div className="subs-dash-actions" style={{ alignItems: "center" }}>
          <Link href="/dashboard/subscriptions" style={{ color: "#949cf7", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
            ← Back to list
          </Link>
          <div className="subs-live-pill" style={{ background: "rgba(88,101,242,0.12)", borderColor: "rgba(88,101,242,0.25)", color: "#c4c8fc" }}>
            <span className="subs-live-dot" style={{ background: "#818cf8", boxShadow: "0 0 0 0 rgba(129,140,248,0.45)" }} />
            As of {format(new Date(), "PP")}
          </div>
        </div>
      </div>

      <div className="subs-kpi-grid">
        {kpis.map((k, idx) => (
          <div
            key={k.label}
            className="subs-kpi-card subs-kpi-enter"
            style={{ animationDelay: `${idx * 0.07}s` }}
          >
            <div className="subs-kpi-card-inner">
              <div className="subs-kpi-label-row">
                <span className="subs-kpi-label">{k.label}</span>
                <div className="subs-kpi-icon-wrap" style={{ background: `${k.color}18` }}>
                  {k.icon}
                </div>
              </div>
              <div className="subs-kpi-value" style={{ color: "#fff" }}>
                {displays[idx]}
              </div>
              {k.refund != null && k.refund > 0 && (
                <div className="subs-kpi-refund">-${k.refund.toFixed(2)} refunded</div>
              )}
              <p className="subs-kpi-meta" style={{ margin: "6px 0 0" }}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <RevenueRefundSplitBar totalRevenue={totalRevenue} totalRefunded={totalRefunded} />

      {stats.series && stats.series.length > 0 && (
        <div className="subs-analytics-grid-charts">
          <AnalyticsRevenueChart series={stats.series} />
          <AnalyticsSubscriptionMixChart series={stats.series} />
        </div>
      )}

      <div className="subs-analytics-grid">
        <div className="subs-glass-panel">
          <h2 className="subs-panel-title">Active plan mix</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Premium</span>
                <span style={{ fontSize: 13, fontWeight: 700, background: "#5865f2", color: "#fff", padding: "3px 10px", borderRadius: 6 }}>{premiumActive}</span>
              </div>
              <div className="subs-plan-bar-track">
                <div
                  className="subs-plan-bar-fill"
                  style={
                    {
                      background: "linear-gradient(90deg, #5865f2, #818cf8)",
                      ["--subs-bar-pct"]: `${pctPremium}%`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Leak Protection</span>
                <span style={{ fontSize: 13, fontWeight: 700, background: "#ED4245", color: "#fff", padding: "3px 10px", borderRadius: 6 }}>{lpActive}</span>
              </div>
              <div className="subs-plan-bar-track">
                <div
                  className="subs-plan-bar-fill"
                  style={
                    {
                      background: "linear-gradient(90deg, #dc2626, #f87171)",
                      ["--subs-bar-pct"]: `${pctLp}%`,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="subs-glass-panel">
          <h2 className="subs-panel-title">PayPal webhooks</h2>
          <p style={{ fontSize: 13, color: "#b9bbbe", lineHeight: 1.65, margin: "0 0 20px" }}>
            Revenue and subscription statuses sync from PayPal. Cancellations in PayPal update here and Discord roles follow your rules.
          </p>
          <div
            style={{
              padding: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div className="subs-webhook-icon-float" style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(87,242,135,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57F287" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Live endpoint</div>
              <div style={{ fontSize: 12, color: "#72767d", lineHeight: 1.5 }}>
                <code
                  style={{
                    background: "#111113",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "#57F287",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                  }}
                >
                  /api/paypal/webhook
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
