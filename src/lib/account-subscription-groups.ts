/** Group PayPal subscriptions by plan for the account page (max two cards: Premium, Leak Protection). */

export type PlanCategoryKey = "PREMIUM" | "LEAK_PROTECTION";

export const ACCOUNT_PLAN_ORDER: PlanCategoryKey[] = ["PREMIUM", "LEAK_PROTECTION"];

export type SubForGrouping = {
  plan_category: string;
  status: string;
  current_period_end: string | null;
  created_at?: string | null;
};

function priorityScore(s: SubForGrouping): number {
  if (s.status === "ACTIVE" || s.status === "PENDING") return 3;
  if (
    (s.status === "CANCELLED" || s.status === "SUSPENDED") &&
    s.current_period_end &&
    new Date(s.current_period_end).getTime() > Date.now()
  ) {
    return 2;
  }
  return 1;
}

/**
 * Featured = best current row (active first, then grace period, then most recent).
 * Others = remaining subscriptions of that plan (history).
 */
export function groupSubscriptionsForAccount<T extends SubForGrouping>(
  subs: T[]
): Partial<Record<PlanCategoryKey, { featured: T; others: T[] }>> {
  const out: Partial<Record<PlanCategoryKey, { featured: T; others: T[] }>> = {};
  for (const cat of ACCOUNT_PLAN_ORDER) {
    const list = subs.filter((s) => s.plan_category === cat);
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => {
      const d = priorityScore(b) - priorityScore(a);
      if (d !== 0) return d;
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
    out[cat] = { featured: sorted[0], others: sorted.slice(1) };
  }
  return out;
}
