/**
 * Subscriptions / Payments / PromoCodes data-access layer (raw MySQL).
 * Tables: subscriptions, payments, promo_codes (already created via SQL).
 */

import { query, queryOne, execute } from "@/lib/db";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionRow = {
  id: string;
  user_id: string;
  paypal_subscription_id: string | null;
  paypal_order_id: string | null;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  currency: string;
  email: string | null;
  payer_name: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  /** When Discord subscription role was removed after cancel (access ended). */
  role_released_at: Date | null;
  /**
   * When 1, PAYMENT.SALE.COMPLETED will not overwrite current_period_end (admin-adjusted renewal).
   */
  period_end_locked?: number;
  /** Optional staff note for why renewal was adjusted (migration credit, etc.). */
  renewal_override_note: string | null;
  promo_code_id: string | null;
  discount_applied: string | null;
  instructions_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PaymentRow = {
  id: string;
  subscription_id: string;
  paypal_transaction_id: string | null;
  paypal_sale_id: string | null;
  amount: string;
  currency: string;
  status: string;
  payer_email: string | null;
  payer_name: string | null;
  refund_amount: string | null;
  refund_reason: string | null;
  refunded_at: Date | null;
  refunded_by: string | null;
  created_at: Date;
};

export type PromoCodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number;
  valid_from: Date | null;
  valid_until: Date | null;
  plan_category: string | null;
  /** When set, only this Discord user id may apply the code (e.g. win-back). */
  restricted_user_id?: string | null;
  /** e.g. "winback" for comeback codes */
  kind?: string | null;
  active: boolean;
  created_at: Date;
};

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export async function logSubscriptionAction(data: {
  subscriptionId: string;
  userId: string;
  action: string;
  details?: Record<string, any>;
}): Promise<void> {
  await execute(
    "INSERT INTO subscription_audit_logs (id, subscription_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)",
    [
      genId("aud"),
      data.subscriptionId,
      data.userId,
      data.action,
      data.details ? JSON.stringify(data.details) : null,
    ]
  ).catch(console.error);
}
// Subscriptions
// ---------------------------------------------------------------------------

export async function createSubscription(data: {
  userId: string;
  paypalSubscriptionId?: string | null;
  paypalOrderId?: string | null;
  planCategory: string;
  planInterval: string;
  status?: string;
  amount: number;
  currency?: string;
  email?: string | null;
  payerName?: string | null;
  promoCodeId?: string | null;
  discountApplied?: number | null;
}): Promise<string> {
  const id = genId("sub");
  await execute(
    `INSERT INTO subscriptions (id, user_id, paypal_subscription_id, paypal_order_id, plan_category, plan_interval, status, amount, currency, email, payer_name, promo_code_id, discount_applied)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.paypalSubscriptionId ?? null,
      data.paypalOrderId ?? null,
      data.planCategory,
      data.planInterval,
      data.status ?? "PENDING",
      data.amount,
      data.currency ?? "USD",
      data.email ?? null,
      data.payerName ?? null,
      data.promoCodeId ?? null,
      data.discountApplied ?? null,
    ]
  );
  return id;
}

export async function getSubscriptionById(id: string): Promise<SubscriptionRow | undefined> {
  return queryOne<SubscriptionRow>("SELECT * FROM subscriptions WHERE id = ?", [id]);
}

export async function getSubscriptionByPaypalId(
  paypalSubscriptionId: string
): Promise<SubscriptionRow | undefined> {
  return queryOne<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE paypal_subscription_id = ?",
    [paypalSubscriptionId]
  );
}

export async function getSubscriptionByPaypalOrderId(
  paypalOrderId: string
): Promise<SubscriptionRow | undefined> {
  return queryOne<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE paypal_order_id = ?",
    [paypalOrderId]
  );
}

export async function getActiveSubscription(
  userId: string,
  planCategory: string
): Promise<SubscriptionRow | undefined> {
  return queryOne<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE user_id = ? AND plan_category = ? AND (status = 'ACTIVE' OR (status IN ('CANCELLED', 'SUSPENDED') AND current_period_end > NOW())) LIMIT 1",
    [userId, planCategory]
  );
}

export async function getUserSubscriptions(userId: string): Promise<SubscriptionRow[]> {
  return query<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    status: string;
    paypalSubscriptionId: string | null;
    paypalOrderId: string | null;
    email: string | null;
    payerName: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    roleReleasedAt: Date | null;
    instructionsSentAt: Date | null;
  }>
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status); }
  if (data.paypalSubscriptionId !== undefined) { sets.push("paypal_subscription_id = ?"); vals.push(data.paypalSubscriptionId); }
  if (data.paypalOrderId !== undefined) { sets.push("paypal_order_id = ?"); vals.push(data.paypalOrderId); }
  if (data.email !== undefined) { sets.push("email = ?"); vals.push(data.email); }
  if (data.payerName !== undefined) { sets.push("payer_name = ?"); vals.push(data.payerName); }
  if (data.currentPeriodStart !== undefined) { sets.push("current_period_start = ?"); vals.push(data.currentPeriodStart); }
  if (data.currentPeriodEnd !== undefined) { sets.push("current_period_end = ?"); vals.push(data.currentPeriodEnd); }
  if (data.cancelledAt !== undefined) { sets.push("cancelled_at = ?"); vals.push(data.cancelledAt); }
  if (data.cancelReason !== undefined) { sets.push("cancel_reason = ?"); vals.push(data.cancelReason); }
  if (data.roleReleasedAt !== undefined) { sets.push("role_released_at = ?"); vals.push(data.roleReleasedAt); }
  if (data.instructionsSentAt !== undefined) { sets.push("instructions_sent_at = ?"); vals.push(data.instructionsSentAt); }

  if (sets.length === 0) return;
  vals.push(id);
  await execute(`UPDATE subscriptions SET ${sets.join(", ")} WHERE id = ?`, vals);
}

// ---------------------------------------------------------------------------
// Subscription listing (admin)
// ---------------------------------------------------------------------------

export type SubscriptionWithUser = SubscriptionRow & {
  username: string;
  avatar: string | null;
  discord_handle: string | null;
};

export async function listSubscriptions(filters?: {
  status?: string;
  planCategory?: string;
  planInterval?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: SubscriptionWithUser[]; total: number }> {
  const where: string[] = [];
  const vals: unknown[] = [];

  if (filters?.status) { where.push("s.status = ?"); vals.push(filters.status); }
  if (filters?.planCategory) { where.push("s.plan_category = ?"); vals.push(filters.planCategory); }
  if (filters?.planInterval) { where.push("s.plan_interval = ?"); vals.push(filters.planInterval); }
  if (filters?.search) {
    where.push("(u.username LIKE ? OR s.user_id LIKE ? OR s.email LIKE ?)");
    const s = `%${filters.search}%`;
    vals.push(s, s, s);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const countRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id ${whereClause}`,
    vals
  );

  const rows = await query<SubscriptionWithUser>(
    `SELECT s.*, u.username, u.avatar, u.discord_handle
     FROM subscriptions s
     LEFT JOIN users u ON s.user_id = u.id
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...vals, limit, offset]
  );

  return { rows, total: countRow?.cnt ?? 0 };
}

// ---------------------------------------------------------------------------
// Stats (admin dashboard)
// ---------------------------------------------------------------------------

export type SubscriptionStats = {
  totalActive: number;
  totalRevenue: number;
  totalRefunded: number;
  mrr: number;
  premiumActive: number;
  lpActive: number;
  totalCancelled: number;
};

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const active = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'ACTIVE'"
  );
  const premiumActive = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'PREMIUM'"
  );
  const lpActive = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'ACTIVE' AND plan_category = 'LEAK_PROTECTION'"
  );
  const cancelled = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'CANCELLED'"
  );
  const revenue = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(CASE
       WHEN status = 'COMPLETED' THEN amount
       WHEN status = 'REFUNDED' THEN amount - COALESCE(refund_amount, 0)
       ELSE 0 END), 0) as total FROM payments`
  );
  const refunded = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(COALESCE(refund_amount, amount)), 0) as total FROM payments WHERE status = 'REFUNDED'"
  );
  const mrr = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(s.amount), 0) as total FROM subscriptions s WHERE s.status = 'ACTIVE' AND s.plan_interval = 'MONTHLY'"
  );
  const yearlyMrr = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(s.amount / 12), 0) as total FROM subscriptions s WHERE s.status = 'ACTIVE' AND s.plan_interval = 'YEARLY'"
  );

  const n = (v: unknown) => Number(v) || 0;

  return {
    totalActive: n(active?.cnt),
    totalRevenue: n(revenue?.total),
    totalRefunded: n(refunded?.total),
    mrr: n(mrr?.total) + n(yearlyMrr?.total),
    premiumActive: n(premiumActive?.cnt),
    lpActive: n(lpActive?.cnt),
    totalCancelled: n(cancelled?.cnt),
  };
}

/** One month bucket for admin analytics charts (payments + subscription events). */
export type SubscriptionAnalyticsMonth = {
  month: string;
  netRevenue: number;
  refunds: number;
  newSubscriptions: number;
  cancellations: number;
};

/**
 * Last N calendar months (including current), filled with zeros where there is no data.
 * `months` is clamped between 6 and 24.
 */
export async function getSubscriptionAnalyticsTimeSeries(months: number): Promise<SubscriptionAnalyticsMonth[]> {
  const nMonths = Math.min(24, Math.max(6, Math.floor(months)));
  const intervalMonths = nMonths - 1;

  const keys: string[] = [];
  const now = new Date();
  for (let i = nMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
  }

  const toNum = (v: unknown) => Number(v) || 0;

  const [payRows, subRows, cancelRows] = await Promise.all([
    query<{ ym: string; net_revenue: unknown; refunds: unknown }>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
              SUM(CASE
                    WHEN status = 'COMPLETED' THEN amount
                    WHEN status = 'REFUNDED' THEN amount - COALESCE(refund_amount, 0)
                    ELSE 0 END) AS net_revenue,
              SUM(CASE WHEN status = 'REFUNDED' THEN COALESCE(refund_amount, amount) ELSE 0 END) AS refunds
       FROM payments
       WHERE created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY ym ASC`,
      [intervalMonths]
    ),
    query<{ ym: string; cnt: unknown }>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS cnt
       FROM subscriptions
       WHERE created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY ym ASC`,
      [intervalMonths]
    ),
    query<{ ym: string; cnt: unknown }>(
      `SELECT DATE_FORMAT(cancelled_at, '%Y-%m') AS ym, COUNT(*) AS cnt
       FROM subscriptions
       WHERE status = 'CANCELLED' AND cancelled_at IS NOT NULL
         AND cancelled_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(cancelled_at, '%Y-%m')
       ORDER BY ym ASC`,
      [intervalMonths]
    ),
  ]);

  const payMap = new Map(payRows.map(r => [r.ym, { net: toNum(r.net_revenue), ref: toNum(r.refunds) }]));
  const subMap = new Map(subRows.map(r => [r.ym, toNum(r.cnt)]));
  const cancelMap = new Map(cancelRows.map(r => [r.ym, toNum(r.cnt)]));

  return keys.map(month => {
    const p = payMap.get(month);
    return {
      month,
      netRevenue: p?.net ?? 0,
      refunds: p?.ref ?? 0,
      newSubscriptions: subMap.get(month) ?? 0,
      cancellations: cancelMap.get(month) ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function createPayment(data: {
  subscriptionId: string;
  paypalTransactionId?: string | null;
  paypalSaleId?: string | null;
  amount: number;
  currency?: string;
  status?: string;
  payerEmail?: string | null;
  payerName?: string | null;
}): Promise<string> {
  const id = genId("pay");
  try {
    await execute(
      `INSERT INTO payments (id, subscription_id, paypal_transaction_id, paypal_sale_id, amount, currency, status, payer_email, payer_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.subscriptionId,
        data.paypalTransactionId ?? null,
        data.paypalSaleId ?? null,
        data.amount,
        data.currency ?? "USD",
        data.status ?? "COMPLETED",
        data.payerEmail ?? null,
        data.payerName ?? null,
      ]
    );
  } catch (e: unknown) {
    const err = e as { errno?: number };
    if (err.errno === 1062 && data.paypalSaleId) {
      const existing = await getPaymentByPaypalSaleId(data.paypalSaleId);
      if (existing) return existing.id;
    }
    throw e;
  }
  return id;
}

export async function getPaymentsBySubscription(subscriptionId: string): Promise<PaymentRow[]> {
  return query<PaymentRow>(
    "SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC",
    [subscriptionId]
  );
}

export async function getPaymentsByUser(userId: string): Promise<(PaymentRow & { plan_category: string })[]> {
  return query<PaymentRow & { plan_category: string }>(
    `SELECT p.*, s.plan_category 
     FROM payments p 
     JOIN subscriptions s ON p.subscription_id = s.id 
     WHERE s.user_id = ? 
     ORDER BY p.created_at DESC`,
    [userId]
  );
}

export async function updatePaymentRefund(
  id: string,
  data: { refundAmount: number; refundReason?: string; refundedBy?: string }
): Promise<void> {
  await execute(
    `UPDATE payments SET status = 'REFUNDED', refund_amount = ?, refund_reason = ?, refunded_at = NOW(), refunded_by = ? WHERE id = ?`,
    [data.refundAmount, data.refundReason ?? null, data.refundedBy ?? null, id]
  );
}

export async function getPaymentByPaypalSaleId(saleId: string): Promise<PaymentRow | undefined> {
  return queryOne<PaymentRow>(
    "SELECT * FROM payments WHERE paypal_sale_id = ?",
    [saleId]
  );
}

export async function getPaymentById(id: string): Promise<PaymentRow | undefined> {
  return queryOne<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
}

/** Cancelled or suspended subscriptions whose paid access has ended (or unknown end) but Discord role not removed yet. */
export async function listSubscriptionsNeedingDiscordRoleRelease(): Promise<SubscriptionRow[]> {
  return query<SubscriptionRow>(
    `SELECT * FROM subscriptions
     WHERE status IN ('CANCELLED', 'SUSPENDED')
       AND role_released_at IS NULL
       AND plan_interval IN ('MONTHLY', 'YEARLY')
       AND (current_period_end IS NULL OR current_period_end <= NOW())`,
    []
  );
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

/**
 * Promo codes are for new site subscribers or active PayPal customers — not for users
 * whose only access is Patreon/Discord roles (migration discount applies there instead).
 */
export async function isUserEligibleForPromoDiscount(userId: string): Promise<boolean> {
  const active = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE'",
    [userId]
  );
  if ((active?.cnt ?? 0) > 0) return true;

  const user = await queryOne<{ patreon_premium: unknown; leak_protection: unknown }>(
    "SELECT COALESCE(patreon_premium, 0) as patreon_premium, COALESCE(leak_protection, 0) as leak_protection FROM users WHERE id = ?",
    [userId]
  );
  if (!user) return true;

  const hasRoleOnlyAccess =
    Boolean(Number(user.patreon_premium)) || Boolean(Number(user.leak_protection));
  return !hasRoleOnlyAccess;
}

export async function getPromoCode(code: string): Promise<PromoCodeRow | undefined> {
  return queryOne<PromoCodeRow>(
    "SELECT * FROM promo_codes WHERE code = ? AND active = 1",
    [code.toUpperCase()]
  );
}

export async function validatePromoCode(
  code: string,
  planCategory?: string,
  userId?: string,
  /** Promos apply to monthly subscriptions only (not yearly or lifetime). */
  planInterval?: "MONTHLY" | "YEARLY" | "LIFETIME"
): Promise<{
  valid: boolean;
  discount?: number;
  error?: string;
  promoId?: string;
  /** When set, promo applies only to this plan (membership UI + checkout must match). */
  planCategory?: string | null;
}> {
  const promo = await getPromoCode(code);
  if (!promo) return { valid: false, error: "Promo code doesn't exist" };

  if (planInterval !== "MONTHLY") {
    return {
      valid: false,
      error:
        planInterval === "YEARLY" || planInterval === "LIFETIME"
          ? promo.kind === "winback"
            ? "Comeback codes apply to monthly billing only."
            : "Promo codes apply to monthly billing only."
          : "Select monthly billing to use a promo code.",
    };
  }

  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return { valid: false, error: "Promo code has reached its usage limit" };
  }
  if (promo.valid_from && new Date() < new Date(promo.valid_from)) {
    return { valid: false, error: "Promo code is not yet active" };
  }
  if (promo.valid_until && new Date() > new Date(promo.valid_until)) {
    return { valid: false, error: "Promo code has expired" };
  }
  if (promo.plan_category && planCategory && promo.plan_category !== planCategory) {
    return { valid: false, error: "Promo code is not valid for this plan" };
  }

  if (userId) {
    if (promo.restricted_user_id) {
      if (promo.restricted_user_id !== userId) {
        return { valid: false, error: "This promo code is linked to another account." };
      }
      // Account-locked codes (win-back): allow even if user only has Patreon/role access
    } else {
      const promoEligible = await isUserEligibleForPromoDiscount(userId);
      if (!promoEligible) {
        return {
          valid: false,
          error:
            "Promo codes are for new subscribers or active PayPal subscriptions. Patreon/role access uses the migration discount instead.",
        };
      }
    }
  }

  if (userId && promo.max_uses_per_user) {
    const usage = await queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM promo_code_usage WHERE promo_code_id = ? AND user_id = ?",
      [promo.id, userId]
    );
    if ((usage?.cnt ?? 0) >= promo.max_uses_per_user) {
      return { valid: false, error: "You've already used this promo code" };
    }
  }

  return {
    valid: true,
    discount: promo.discount_percent,
    promoId: promo.id,
    planCategory: promo.plan_category ?? null,
  };
}

export async function recordPromoUsage(promoCodeId: string, userId: string): Promise<void> {
  const id = genId("pu");
  await execute(
    "INSERT IGNORE INTO promo_code_usage (id, promo_code_id, user_id) VALUES (?, ?, ?)",
    [id, promoCodeId, userId]
  );
}

export async function incrementPromoUsage(id: string): Promise<void> {
  await execute("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?", [id]);
}

export async function listPromoCodes(): Promise<PromoCodeRow[]> {
  return query<PromoCodeRow>("SELECT * FROM promo_codes ORDER BY created_at DESC");
}

export async function createPromoCode(data: {
  code: string;
  discountPercent: number;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  planCategory?: string | null;
  restrictedUserId?: string | null;
  kind?: string | null;
}): Promise<string> {
  const id = genId("promo");
  await execute(
    `INSERT INTO promo_codes (id, code, discount_percent, max_uses, max_uses_per_user, valid_from, valid_until, plan_category, restricted_user_id, kind)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.code.toUpperCase(),
      data.discountPercent,
      data.maxUses ?? null,
      data.maxUsesPerUser ?? null,
      data.validFrom ?? null,
      data.validUntil ?? null,
      data.planCategory ?? null,
      data.restrictedUserId ?? null,
      data.kind ?? null,
    ]
  );
  return id;
}

export async function updatePromoCode(
  id: string,
  data: Partial<{
    code: string;
    discountPercent: number;
    maxUses: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
    planCategory: string | null;
    active: boolean;
  }>
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (data.code !== undefined) { sets.push("code = ?"); vals.push(data.code.toUpperCase()); }
  if (data.discountPercent !== undefined) { sets.push("discount_percent = ?"); vals.push(data.discountPercent); }
  if (data.maxUses !== undefined) { sets.push("max_uses = ?"); vals.push(data.maxUses); }
  if (data.validFrom !== undefined) { sets.push("valid_from = ?"); vals.push(data.validFrom); }
  if (data.validUntil !== undefined) { sets.push("valid_until = ?"); vals.push(data.validUntil); }
  if (data.planCategory !== undefined) { sets.push("plan_category = ?"); vals.push(data.planCategory); }
  if (data.active !== undefined) { sets.push("active = ?"); vals.push(data.active ? 1 : 0); }

  if (sets.length === 0) return;
  vals.push(id);
  await execute(`UPDATE promo_codes SET ${sets.join(", ")} WHERE id = ?`, vals);
}

// ---------------------------------------------------------------------------
// Migration discounts (one-time per user per plan category)
// ---------------------------------------------------------------------------

export type MigrationDiscountRow = {
  id: string;
  user_id: string;
  plan_category: string;
  discount_amount: string;
  original_price: string;
  final_price: string;
  paypal_id: string | null;
  used_at: Date;
};

export async function hasMigrationDiscount(
  userId: string,
  planCategory: string
): Promise<boolean> {
  const row = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM migration_discounts WHERE user_id = ? AND plan_category = ?",
    [userId, planCategory]
  );
  return (row?.cnt ?? 0) > 0;
}

export async function recordMigrationDiscount(data: {
  userId: string;
  planCategory: string;
  discountAmount: number;
  originalPrice: number;
  finalPrice: number;
  paypalId?: string | null;
}): Promise<string> {
  const id = genId("mig");
  await execute(
    `INSERT INTO migration_discounts (id, user_id, plan_category, discount_amount, original_price, final_price, paypal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.planCategory,
      data.discountAmount,
      data.originalPrice,
      data.finalPrice,
      data.paypalId ?? null,
    ]
  );
  return id;
}

/** If `MIGRATION_DISCOUNT_DEADLINE` is unset, migration window is open (backward compatible). */
export function isMigrationDiscountDeadlineOpen(): boolean {
  const raw = process.env.MIGRATION_DISCOUNT_DEADLINE?.trim();
  if (!raw) return true;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return true;
  return Date.now() <= d.getTime();
}

/**
 * Check if user is eligible for a migration discount.
 * Eligible if user has the legacy flag AND has not already used a migration discount for that plan
 * AND the global migration offer window (`MIGRATION_DISCOUNT_DEADLINE`) is still open.
 */
export async function getMigrationEligibility(
  userId: string,
  planCategory: string
): Promise<{ eligible: boolean; discountPercent: number }> {
  if (!isMigrationDiscountDeadlineOpen()) {
    return { eligible: false, discountPercent: 0 };
  }

  const alreadyUsed = await hasMigrationDiscount(userId, planCategory);
  if (alreadyUsed) return { eligible: false, discountPercent: 0 };

  const flagCol = planCategory === "PREMIUM" ? "patreon_premium" : "leak_protection";
  const user = await queryOne<Record<string, unknown>>(
    `SELECT ${flagCol} as flag FROM users WHERE id = ?`,
    [userId]
  );

  if (!user) return { eligible: false, discountPercent: 0 };

  const hasFlag = Number(user.flag) === 1;
  if (!hasFlag) return { eligible: false, discountPercent: 0 };

  const discountPercent = planCategory === "PREMIUM" ? 50 : 50;
  return { eligible: true, discountPercent };
}

// ---------------------------------------------------------------------------
// Win-back promos (post-cancellation comeback codes)
// ---------------------------------------------------------------------------

const WINBACK_KIND = "winback";

function winbackValidDays(): number {
  const n = parseInt(process.env.WINBACK_PROMO_VALID_DAYS ?? "30", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function winbackMinTenureDays(): number {
  const n = parseInt(process.env.WINBACK_MIN_TENURE_DAYS ?? "14", 10);
  return Number.isFinite(n) && n >= 0 ? n : 14;
}

function winbackAbuseMaxTenureDays(): number {
  const n = parseInt(process.env.WINBACK_ABUSE_MAX_TENURE_DAYS ?? "45", 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

function calendarMonthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

function hasThreeConsecutiveMonths(sortedUniqueKeys: number[]): boolean {
  const u = [...new Set(sortedUniqueKeys)].sort((a, b) => a - b);
  for (let i = 0; i <= u.length - 3; i++) {
    if (u[i + 1] === u[i] + 1 && u[i + 2] === u[i] + 2) return true;
  }
  return false;
}

function isSwitchPlanCancelReason(reason: string | null): boolean {
  if (!reason) return false;
  if (reason.includes("Switching plans")) return true;
  try {
    const j = JSON.parse(reason) as { intent?: string };
    return j?.intent === "switch";
  } catch {
    return false;
  }
}

export async function countWinbackGrantsLast365Days(userId: string): Promise<number> {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM winback_promo_grants
     WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)`,
    [userId]
  );
  return row?.cnt ?? 0;
}

/** Prior cancelled recurring subs (excluding one id), for first-churn detection. */
export async function countPriorCancelledRecurring(userId: string, excludeSubscriptionId: string): Promise<number> {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM subscriptions
     WHERE user_id = ? AND status = 'CANCELLED'
       AND plan_interval IN ('MONTHLY', 'YEARLY')
       AND id != ?`,
    [userId, excludeSubscriptionId]
  );
  return row?.cnt ?? 0;
}

/**
 * Short-tenure qualifying cancels used for consecutive-month abuse detection.
 */
async function getShortTenureCancelMonthKeys(
  userId: string,
  excludeSubscriptionId: string,
  maxTenureDays: number
): Promise<number[]> {
  const rows = await query<{
    cancelled_at: Date | string;
    created_at: Date | string;
    cancel_reason: string | null;
  }>(
    `SELECT cancelled_at, created_at, cancel_reason FROM subscriptions
     WHERE user_id = ? AND status = 'CANCELLED'
       AND plan_interval IN ('MONTHLY', 'YEARLY')
       AND id != ?
       AND cancelled_at IS NOT NULL`,
    [userId, excludeSubscriptionId]
  );
  const keys: number[] = [];
  for (const r of rows) {
    if (isSwitchPlanCancelReason(r.cancel_reason)) continue;
    const ca = r.cancelled_at instanceof Date ? r.cancelled_at : new Date(r.cancelled_at);
    const cr = r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
    if (isNaN(ca.getTime()) || isNaN(cr.getTime())) continue;
    const days = Math.floor((ca.getTime() - cr.getTime()) / (24 * 60 * 60 * 1000));
    if (days >= maxTenureDays) continue;
    keys.push(calendarMonthKey(ca));
  }
  return keys;
}

export type WinBackOfferResult = {
  offer: boolean;
  reason: string;
};

/**
 * Decide whether to issue a win-back promo after a user cancels (before DB row is updated to CANCELLED).
 */
export async function shouldOfferWinBackPromo(params: {
  userId: string;
  subscription: SubscriptionRow;
  intent?: "switch" | undefined;
}): Promise<WinBackOfferResult> {
  const { userId, subscription: sub, intent } = params;

  if (intent === "switch") {
    return { offer: false, reason: "switch_plan" };
  }
  if (sub.plan_interval !== "MONTHLY") {
    return { offer: false, reason: "not_monthly_plan" };
  }

  const grants = await countWinbackGrantsLast365Days(userId);
  if (grants >= 3) {
    return { offer: false, reason: "rolling_cap_3" };
  }

  const priorCancelled = await countPriorCancelledRecurring(userId, sub.id);
  const isFirstChurn = priorCancelled === 0;

  if (isFirstChurn) {
    return { offer: true, reason: "first_churn" };
  }

  const minTenure = winbackMinTenureDays();
  const created = sub.created_at instanceof Date ? sub.created_at : new Date(sub.created_at);
  const daysActive = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
  if (daysActive < minTenure) {
    return { offer: false, reason: "min_tenure_not_met" };
  }

  const abuseMax = winbackAbuseMaxTenureDays();
  const priorMonths = await getShortTenureCancelMonthKeys(userId, sub.id, abuseMax);
  const thisMonth = calendarMonthKey(new Date());
  const allKeys = [...priorMonths, thisMonth];
  if (hasThreeConsecutiveMonths(allKeys)) {
    return { offer: false, reason: "consecutive_month_churn" };
  }

  return { offer: true, reason: "repeat_ok" };
}

export async function createWinBackPromoCode(params: {
  userId: string;
  planCategory: "PREMIUM" | "LEAK_PROTECTION";
  subscriptionId: string;
  eligibilityReason: string;
}): Promise<{ code: string; promoId: string; validUntil: Date }> {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const code = `COMEBACK-${suffix}`;
  const validDays = winbackValidDays();
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  const promoId = await createPromoCode({
    code,
    discountPercent: 20,
    maxUses: 1,
    maxUsesPerUser: 1,
    validUntil,
    planCategory: params.planCategory,
    restrictedUserId: params.userId,
    kind: WINBACK_KIND,
  });

  const grantId = genId("wb");
  await execute(
    `INSERT INTO winback_promo_grants (id, user_id, promo_code_id, subscription_id, eligibility_reason)
     VALUES (?, ?, ?, ?, ?)`,
    [grantId, params.userId, promoId, params.subscriptionId, params.eligibilityReason.slice(0, 255)]
  );

  return { code, promoId, validUntil };
}

// ---------------------------------------------------------------------------
// Stale PENDING cleanup
// ---------------------------------------------------------------------------

export async function cleanupStalePending(): Promise<number> {
  const result = await execute(
    `UPDATE subscriptions SET status = 'EXPIRED' WHERE status = 'PENDING' AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)`
  );
  return (result as { affectedRows?: number })?.affectedRows ?? 0;
}

// ---------------------------------------------------------------------------
// Webhook event logging
// ---------------------------------------------------------------------------

export async function logWebhookEvent(data: {
  eventId: string;
  eventType: string;
  resourceId: string | null;
  payload: string;
}): Promise<boolean> {
  const result = await execute(
    `INSERT IGNORE INTO webhook_events (id, event_type, resource_id, payload) VALUES (?, ?, ?, ?)`,
    [data.eventId, data.eventType, data.resourceId, data.payload]
  );
  return ((result as any)?.affectedRows ?? 0) > 0;
}
