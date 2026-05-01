"use client";

import { format, parse } from "date-fns";

export type AnalyticsSeriesRow = {
  month: string;
  netRevenue: number;
  refunds: number;
  newSubscriptions: number;
  cancellations: number;
};

function monthLabel(ym: string) {
  try {
    return format(parse(`${ym}-01`, "yyyy-MM-dd", new Date()), "MMM yy");
  } catch {
    return ym;
  }
}

/** Net revenue (area + line) and refunds (line) — last N months from API. */
export function AnalyticsRevenueChart({ series }: { series: AnalyticsSeriesRow[] }) {
  if (!series.length) return null;

  const VB_W = 400;
  const VB_H = 132;
  const plotX0 = 36;
  const plotY0 = 12;
  const plotW = VB_W - plotX0 - 12;
  const plotH = 78;
  const baseY = plotY0 + plotH;

  const n = series.length;
  const maxY = Math.max(1, ...series.map(s => Math.max(s.netRevenue, s.refunds))) * 1.08;

  const xi = (i: number) => plotX0 + plotW * (n === 1 ? 0.5 : i / (n - 1));
  const yv = (v: number) => plotY0 + plotH * (1 - v / maxY);

  const firstX = xi(0);
  const lastX = xi(n - 1);
  const areaD = `M ${firstX} ${baseY} L ${series.map((s, i) => `${xi(i)} ${yv(s.netRevenue)}`).join(" L ")} L ${lastX} ${baseY} Z`;

  const netLineD = series.map((s, i) => `${i === 0 ? "M" : "L"} ${xi(i)} ${yv(s.netRevenue)}`).join(" ");
  const refLineD = series.map((s, i) => `${i === 0 ? "M" : "L"} ${xi(i)} ${yv(s.refunds)}`).join(" ");

  return (
    <div className="subs-chart-card subs-chart-card--real">
      <div className="subs-chart-head">
        <div>
          <h3 className="subs-chart-title">Revenue by month</h3>
          <p className="subs-chart-sub">Net recorded from payments vs gross refunds (same period).</p>
        </div>
        <div className="subs-chart-legend-inline" style={{ marginTop: 0 }}>
          <span>
            <span className="subs-chart-line-swatch" style={{ background: "linear-gradient(90deg,#22c55e,#4ade80)" }} />
            Net revenue
          </span>
          <span>
            <span className="subs-chart-line-swatch" style={{ background: "#fb7185" }} />
            Refunds
          </span>
        </div>
      </div>
      <svg
        className="subs-analytics-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Revenue and refunds by month"
      >
        <defs>
          <linearGradient id="subsNetFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const gy = plotY0 + plotH * (1 - t);
          return (
            <line
              key={t}
              x1={plotX0}
              y1={gy}
              x2={plotX0 + plotW}
              y2={gy}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          );
        })}
        <path d={areaD} fill="url(#subsNetFill)" stroke="none" />
        <path
          d={refLineD}
          fill="none"
          stroke="#fb7185"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="subs-analytics-stroke"
        />
        <path
          d={netLineD}
          fill="none"
          stroke="#4ade80"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="subs-analytics-stroke subs-analytics-stroke--net"
        />
        {series.map((s, i) => (
          <g key={s.month}>
            <circle cx={xi(i)} cy={yv(s.netRevenue)} r={3.5} fill="#111113" stroke="#4ade80" strokeWidth={1.5}>
              <title>{`${monthLabel(s.month)}: net $${s.netRevenue.toFixed(2)}`}</title>
            </circle>
            <circle cx={xi(i)} cy={yv(s.refunds)} r={3} fill="#111113" stroke="#fb7185" strokeWidth={1.2}>
              <title>{`${monthLabel(s.month)}: refunds $${s.refunds.toFixed(2)}`}</title>
            </circle>
          </g>
        ))}
        <text x={4} y={plotY0 + 4} fill="#72767d" fontSize={9} fontFamily="system-ui,sans-serif">
          ${maxY.toFixed(0)}
        </text>
        <text x={4} y={baseY - 2} fill="#72767d" fontSize={9} fontFamily="system-ui,sans-serif">
          $0
        </text>
      </svg>
      <div className="subs-analytics-x-labels">
        {series.map((s, i) => (
          <span key={s.month} title={s.month}>
            {monthLabel(s.month)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** New subscriptions vs cancellations per month. */
export function AnalyticsSubscriptionMixChart({ series }: { series: AnalyticsSeriesRow[] }) {
  if (!series.length) return null;

  const VB_W = 400;
  const VB_H = 128;
  const plotX0 = 36;
  const plotY0 = 10;
  const plotW = VB_W - plotX0 - 12;
  const plotH = 82;

  const n = series.length;
  const maxY = Math.max(1, ...series.flatMap(s => [s.newSubscriptions, s.cancellations])) * 1.1;

  const groupW = plotW / n;
  const barW = Math.min(14, groupW * 0.32);
  const yv = (v: number) => plotY0 + plotH * (1 - v / maxY);
  const baseY = plotY0 + plotH;

  return (
    <div className="subs-chart-card subs-chart-card--real">
      <div className="subs-chart-head">
        <div>
          <h3 className="subs-chart-title">New vs cancelled</h3>
          <p className="subs-chart-sub">Subscription rows created vs cancellations (by calendar month).</p>
        </div>
        <div className="subs-chart-legend-inline" style={{ marginTop: 0 }}>
          <span>
            <span className="subs-chart-line-swatch" style={{ background: "#818cf8" }} />
            New
          </span>
          <span>
            <span className="subs-chart-line-swatch" style={{ background: "#f87171" }} />
            Cancelled
          </span>
        </div>
      </div>
      <svg
        className="subs-analytics-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="New subscriptions and cancellations by month"
      >
        <defs>
          <linearGradient id="subsBarNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#5865f2" />
          </linearGradient>
          <linearGradient id="subsBarCan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(t => {
          const gy = plotY0 + plotH * (1 - t);
          return (
            <line
              key={t}
              x1={plotX0}
              y1={gy}
              x2={plotX0 + plotW}
              y2={gy}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          );
        })}
        {series.map((s, i) => {
          const cx = plotX0 + i * groupW + groupW / 2;
          const xNew = cx - barW - 2;
          const xCan = cx + 2;
          const hNew = baseY - yv(s.newSubscriptions);
          const hCan = baseY - yv(s.cancellations);
          return (
            <g key={s.month}>
              <rect
                x={xNew}
                y={yv(s.newSubscriptions)}
                width={barW}
                height={hNew}
                rx={3}
                fill="url(#subsBarNew)"
                className="subs-bar-rise"
              >
                <title>{`New: ${s.newSubscriptions} (${monthLabel(s.month)})`}</title>
              </rect>
              <rect
                x={xCan}
                y={yv(s.cancellations)}
                width={barW}
                height={hCan}
                rx={3}
                fill="url(#subsBarCan)"
                className="subs-bar-rise"
              >
                <title>{`Cancelled: ${s.cancellations} (${monthLabel(s.month)})`}</title>
              </rect>
            </g>
          );
        })}
        <text x={4} y={plotY0 + 4} fill="#72767d" fontSize={9} fontFamily="system-ui,sans-serif">
          {Math.ceil(maxY)}
        </text>
        <text x={4} y={baseY - 1} fill="#72767d" fontSize={9} fontFamily="system-ui,sans-serif">
          0
        </text>
      </svg>
      <div className="subs-analytics-x-labels">
        {series.map(s => (
          <span key={s.month} title={s.month}>
            {monthLabel(s.month)}
          </span>
        ))}
      </div>
    </div>
  );
}
