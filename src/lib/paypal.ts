/**
 * PayPal REST API client for Subscriptions & One-time Payments.
 *
 * Env vars required:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_WEBHOOK_ID
 *   PAYPAL_MODE  ("sandbox" | "live", default "sandbox")
 */

/* ------------------------------------------------------------------ */
/*  Base helpers                                                       */
/* ------------------------------------------------------------------ */

const PAYPAL_BASE =
  (process.env.PAYPAL_MODE ?? "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };
  return cachedToken.token;
}

async function paypalFetch(path: string, opts: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`PayPal ${opts.method ?? "GET"} ${path} ${res.status}: ${text}`);
  return json;
}

/* ------------------------------------------------------------------ */
/*  Plan Config (prices & PayPal plan IDs from env)                    */
/* ------------------------------------------------------------------ */

export type PlanCategory = "PREMIUM" | "LEAK_PROTECTION";
export type PlanInterval = "MONTHLY" | "YEARLY" | "LIFETIME";

interface PlanConfig {
  price: number;
  discountedPrice?: number; // after yearly discount
  paypalPlanId?: string;    // for recurring (set in env)
}

/**
 * Pricing config. PayPal plan IDs come from env because they are
 * created in the PayPal dashboard (or via API).
 */
export const PLAN_CONFIG: Record<PlanCategory, Record<PlanInterval, PlanConfig>> = {
  PREMIUM: {
    MONTHLY: {
      price: 3,
      paypalPlanId: process.env.PAYPAL_PLAN_PREMIUM_MONTHLY ?? "",
    },
    YEARLY: {
      price: 36,
      discountedPrice: 28.80,
      paypalPlanId: process.env.PAYPAL_PLAN_PREMIUM_YEARLY ?? "",
    },
    LIFETIME: {
      price: 75,
    },
  },
  LEAK_PROTECTION: {
    MONTHLY: {
      price: 10,
      paypalPlanId: process.env.PAYPAL_PLAN_LP_MONTHLY ?? "",
    },
    YEARLY: {
      price: 120,
      discountedPrice: 96,
      paypalPlanId: process.env.PAYPAL_PLAN_LP_YEARLY ?? "",
    },
    LIFETIME: {
      price: 200,
    },
  },
};

/**
 * Get the effective price for a plan, applying yearly discount and optional promo.
 */
export function getEffectivePrice(
  category: PlanCategory,
  interval: PlanInterval,
  promoPercent = 0
): { original: number; final: number; savings: number } {
  const plan = PLAN_CONFIG[category][interval];
  const original = plan.price;
  const afterYearly = plan.discountedPrice ?? original;
  const promoDiscount = afterYearly * (promoPercent / 100);
  const final = Math.round((afterYearly - promoDiscount) * 100) / 100;
  return { original, final, savings: Math.round((original - final) * 100) / 100 };
}

/* ------------------------------------------------------------------ */
/*  Subscriptions (recurring)                                          */
/* ------------------------------------------------------------------ */

export interface CreateSubscriptionResult {
  subscriptionId: string;
  approvalUrl: string;
}

export async function createSubscription(
  planId: string,
  returnUrl: string,
  cancelUrl: string,
  customId?: string
): Promise<CreateSubscriptionResult> {
  const body: Record<string, unknown> = {
    plan_id: planId,
    application_context: {
      brand_name: "6URE",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
  if (customId) {
    body.custom_id = customId;
  }

  const data = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const approvalLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  );

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink?.href ?? "",
  };
}

export async function getSubscriptionDetails(subscriptionId: string) {
  return paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string, reason?: string) {
  return paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? "Cancelled by user" }),
  });
}

/* ------------------------------------------------------------------ */
/*  One-time Payment (lifetime plans)                                  */
/* ------------------------------------------------------------------ */

export interface CreateOrderResult {
  orderId: string;
  approvalUrl: string;
}

export async function createOrder(
  amount: number,
  description: string,
  returnUrl: string,
  cancelUrl: string,
  customId?: string
): Promise<CreateOrderResult> {
  const data = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          description,
          ...(customId ? { custom_id: customId } : {}),
        },
      ],
      application_context: {
        brand_name: "6URE",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  const approvalLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  );

  return {
    orderId: data.id,
    approvalUrl: approvalLink?.href ?? "",
  };
}

export async function captureOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
  });
}

/* ------------------------------------------------------------------ */
/*  Refunds                                                            */
/* ------------------------------------------------------------------ */

export async function refundSale(
  saleId: string,
  amount?: number,
  reason?: string
) {
  const body: Record<string, unknown> = {};
  if (amount !== undefined) {
    body.amount = { currency_code: "USD", value: amount.toFixed(2) };
  }
  if (reason) body.note_to_payer = reason;

  return paypalFetch(`/v2/payments/captures/${saleId}/refund`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------------ */
/*  Webhook Verification                                               */
/* ------------------------------------------------------------------ */

export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("[PayPal] PAYPAL_WEBHOOK_ID not set, skipping verification");
    return true; // allow in dev
  }

  try {
    const data = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"] ?? "",
        cert_url: headers["paypal-cert-url"] ?? "",
        transmission_id: headers["paypal-transmission-id"] ?? "",
        transmission_sig: headers["paypal-transmission-sig"] ?? "",
        transmission_time: headers["paypal-transmission-time"] ?? "",
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    return data.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[PayPal] Webhook verification error:", err);
    return false;
  }
}
