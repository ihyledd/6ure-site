"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, options?: { duration?: number; decimals?: number; enabled?: boolean }) {
  const duration = options?.duration ?? 900;
  const decimals = options?.decimals ?? 0;
  const enabled = options?.enabled ?? true;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const start = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - (1 - p) ** 3;
      setValue(start + (target - start) * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

export function UsersGroupIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Stacked bar: net revenue vs refunds (real data). */
export function RevenueRefundSplitBar({
  totalRevenue,
  totalRefunded,
}: {
  totalRevenue: number;
  totalRefunded: number;
}) {
  const gross = Math.max(0, totalRevenue + totalRefunded);
  const netPct = gross > 0 ? (totalRevenue / gross) * 100 : 100;
  const refPct = gross > 0 ? (totalRefunded / gross) * 100 : 0;

  return (
    <div className="subs-split-card">
      <div className="subs-split-head">
        <div>
          <div className="subs-split-title">Revenue composition</div>
          <div className="subs-split-hint">Net recorded revenue vs refunds (same currency)</div>
        </div>
      </div>
      <div className="subs-split-bar" style={{ gap: 2 }}>
        <div
          className="subs-split-seg"
          style={{
            width: `${netPct}%`,
            background: "linear-gradient(90deg, #22c55e, #4ade80)",
            minWidth: netPct > 0 ? 4 : 0,
          }}
        />
        <div
          className="subs-split-seg"
          style={{
            width: `${refPct}%`,
            background: "linear-gradient(90deg, #f87171, #fb7185)",
            minWidth: refPct > 0 ? 4 : 0,
          }}
        />
      </div>
      <div className="subs-split-legend">
        <span>
          <span className="subs-split-dot" style={{ background: "#4ade80" }} />
          Net revenue ${totalRevenue.toFixed(2)}
        </span>
        <span>
          <span className="subs-split-dot" style={{ background: "#fb7185" }} />
          Refunded ${totalRefunded.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
