/**
 * PayPal REST API integration for subscriptions (recurring) and orders (lifetime one-time).
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? "";
const PAYPAL_MODE = process.env.PAYPAL_MODE ?? "sandbox";

const BASE =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/* ---- Plan config ---- */
export const PLAN_CONFIG = {
  PREMIUM: {
    MONTHLY: {
      price: 3,
      discountedPrice: null as number | null,
      paypalPlanId: process.env.PAYPAL_PLAN_PREMIUM_MONTHLY ?? "",
    },
    YEARLY: {
      price: 36,
      discountedPrice: 28.8, // 20% off
      paypalPlanId: process.env.PAYPAL_PLAN_PREMIUM_YEARLY ?? "",
    },
    LIFETIME: {
      price: 75,
      discountedPrice: null as number | null,
      paypalPlanId: null as string | null,
    },
  },
  LEAK_PROTECTION: {
    MONTHLY: {
      price: 10,
      discountedPrice: null as number | null,
      paypalPlanId: process.env.PAYPAL_PLAN_LP_MONTHLY ?? "",
    },
    YEARLY: {
      price: 120,
      discountedPrice: 96, // 20% off
      paypalPlanId: process.env.PAYPAL_PLAN_LP_YEARLY ?? "",
    },
    LIFETIME: {
      price: 200,
      discountedPrice: null as number | null,
      paypalPlanId: null as string | null,
    },
  },
} as const;

export function getEffectivePrice(
  category: "PREMIUM" | "LEAK_PROTECTION",
  interval: "MONTHLY" | "YEARLY" | "LIFETIME",
  promoPercent = 0
) {
  const cfg = PLAN_CONFIG[category][interval];
  const base = cfg.discountedPrice ?? cfg.price;
  const final =
    promoPercent > 0 ? Math.round(base * (1 - promoPercent / 100) * 100) / 100 : base;
  return { base, final };
}

/* ---- Auth ---- */
let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[PayPal] ${init.method ?? "GET"} ${path} -> ${res.status}`, text);
    throw new Error(`PayPal API error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---- Subscriptions (recurring) ---- */
export async function createSubscription(
  planId: string,
  returnUrl: string,
  cancelUrl: string,
  customId: string
) {
  const data = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      custom_id: customId,
      application_context: {
        brand_name: "6URE",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const approvalUrl = data.links?.find((l: { rel: string }) => l.rel === "approve")?.href;
  return { subscriptionId: data.id as string, approvalUrl: approvalUrl as string };
}

export async function getSubscriptionDetails(subscriptionId: string) {
  return paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string, reason: string) {
  return paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/* ---- Orders (one-time / lifetime) ---- */
export async function createOrder(
  amount: number,
  description: string,
  returnUrl: string,
  cancelUrl: string,
  customId: string
) {
  const data = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description,
          custom_id: customId,
        },
      ],
      application_context: {
        brand_name: "6URE",
        shipping_preference: "NO_SHIPPING",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const approvalUrl = data.links?.find((l: { rel: string }) => l.rel === "approve")?.href;
  return { orderId: data.id as string, approvalUrl: approvalUrl as string };
}

export async function captureOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
}

/* ---- Refunds ---- */
export async function refundSale(captureId: string, amount?: number, reason?: string) {
  const body: Record<string, unknown> = {};
  if (amount) body.amount = { currency_code: "USD", value: amount.toFixed(2) };
  if (reason) body.note_to_payer = reason;
  return paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ---- Webhook verification ---- */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID) return false;
  try {
    const data = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    return data?.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
