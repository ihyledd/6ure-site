/**
 * Single source of truth for "may assign Discord role for this subscription" (UI + API).
 * Mirrors previous sync-discord-role route logic with normalized status strings.
 */
export type SubscriptionDiscordSyncFields = {
  plan_category: string;
  plan_interval: string;
  status: string;
  current_period_end: string | Date | null;
};

export function isSubscriptionEligibleForDiscordSync(sub: SubscriptionDiscordSyncFields): boolean {
  const cat = String(sub.plan_category ?? "")
    .trim()
    .toUpperCase();
  if (cat !== "PREMIUM" && cat !== "LEAK_PROTECTION") return false;

  const interval = String(sub.plan_interval ?? "")
    .trim()
    .toUpperCase();
  const st = String(sub.status ?? "")
    .trim()
    .toUpperCase();

  if (st === "EXPIRED") return false;

  if (interval === "LIFETIME") {
    return st === "ACTIVE" || st === "PENDING";
  }
  if (st === "ACTIVE" || st === "PENDING") return true;
  if (st === "CANCELLED" || st === "SUSPENDED") {
    if (!sub.current_period_end) return false;
    const t = new Date(sub.current_period_end).getTime();
    if (Number.isNaN(t)) return false;
    return t > Date.now();
  }
  return false;
}
