/**
 * PayPal REST API client.
 * Supports dynamic recurring subscriptions (monthly/yearly) and one-time orders (lifetime).
 * Products and billing plans are created on-the-fly — no hardcoded plan IDs needed.
 */

import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";
import { getPlanPrice } from "@/lib/pricing";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const PAYPAL_MODE = process.env.PAYPAL_MODE ?? "sandbox";

const BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ---------------------------------------------------------------------------
// OAuth2 access token (cached)
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------

const PAYPAL_TIMEOUT_MS = 15_000;

async function paypalFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const token = await getAccessToken();
  const { method = "GET", body, headers = {} } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYPAL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers,
      },
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`PayPal API ${method} ${path} timed out after ${PAYPAL_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return {} as T;

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ---------------------------------------------------------------------------
// Products (created once per category, cached in site_settings)
// ---------------------------------------------------------------------------

type PayPalProduct = { id: string; name: string };

const PRODUCT_NAMES: Record<string, string> = {
  PREMIUM: "6ure Premium",
  LEAK_PROTECTION: "6ure Leak Protection",
};

async function ensureProduct(planCategory: "PREMIUM" | "LEAK_PROTECTION"): Promise<string> {
  const settingsKey = `paypal_product_${planCategory.toLowerCase()}`;
  const existing = await getSiteSetting(settingsKey);
  if (existing) return existing;

  const product = await paypalFetch<PayPalProduct>("/v1/catalogs/products", {
    method: "POST",
    body: {
      name: PRODUCT_NAMES[planCategory],
      type: "SERVICE",
      category: "SOFTWARE",
    },
    headers: {
      "PayPal-Request-Id": `product-${planCategory}-${Date.now()}`,
    },
  });

  await setSiteSetting(settingsKey, product.id);
  console.log(`[PayPal] Created product ${product.id} for ${planCategory}`);
  return product.id;
}

// ---------------------------------------------------------------------------
// Billing Plans (created dynamically per checkout)
// ---------------------------------------------------------------------------

type PayPalPlan = { id: string; status: string };

async function createBillingPlan(params: {
  productId: string;
  planCategory: "PREMIUM" | "LEAK_PROTECTION";
  interval: "MONTHLY" | "YEARLY";
  price: string;
  username?: string;
  overridePrice?: string;
}): Promise<string> {
  const intervalUnit = params.interval === "YEARLY" ? "YEAR" : "MONTH";
  const label = PRODUCT_NAMES[params.planCategory];
  const finalPrice = params.overridePrice ?? params.price;
  const desc = params.username
    ? `Subscription for @${params.username}`
    : `${label} subscription`;

  const plan = await paypalFetch<PayPalPlan>("/v1/billing/plans", {
    method: "POST",
    body: {
      product_id: params.productId,
      name: `${label} — ${params.interval === "YEARLY" ? "Yearly" : "Monthly"}`,
      description: desc,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: intervalUnit, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: finalPrice, currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    },
    headers: {
      "PayPal-Request-Id": `plan-${params.planCategory}-${params.interval}-${Math.floor(Date.now() / 60000)}`,
    },
  });

  return plan.id;
}

// ---------------------------------------------------------------------------
// Subscriptions (recurring) — dynamic: product → plan → subscription
// ---------------------------------------------------------------------------

export type PayPalSubscription = {
  id: string;
  plan_id: string;
  status: string;
  subscriber?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value: string; currency_code: string };
      time?: string;
    };
  };
  create_time: string;
  update_time?: string;
  custom_id?: string;
  start_time?: string;
  links?: Array<{ href: string; rel: string }>;
};

/**
 * Full flow: ensure product → create plan → create subscription.
 * Uses application_context for return/cancel URLs (required for approval redirect).
 */
export async function createDynamicSubscription(params: {
  planCategory: "PREMIUM" | "LEAK_PROTECTION";
  planInterval: "MONTHLY" | "YEARLY";
  customId: string;
  returnUrl: string;
  cancelUrl: string;
  username?: string;
  overridePrice?: string;
}): Promise<PayPalSubscription> {
  const productId = await ensureProduct(params.planCategory);
  const price = getPlanPrice(params.planCategory, params.planInterval).toFixed(2);

  const planId = await createBillingPlan({
    productId,
    planCategory: params.planCategory,
    interval: params.planInterval,
    price,
    username: params.username,
    overridePrice: params.overridePrice,
  });

  // Use application_context (not subscriber.payment_source) — PayPal requires this
  // for the approval redirect flow. The payment_source shape is for vaulted payers
  // and causes subscription creation to fail with a 4xx from PayPal.
  return paypalFetch<PayPalSubscription>("/v1/billing/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId,
      custom_id: params.customId,
      application_context: {
        brand_name: "6ure",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    },
    headers: {
      "PayPal-Request-Id": `sub-${params.customId}-${Math.floor(Date.now() / 60000)}`,
    },
  });
}

/** Get subscription details from PayPal. */
export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  return paypalFetch<PayPalSubscription>(`/v1/billing/subscriptions/${subscriptionId}`);
}

/**
 * End of paid access after cancel: use `billing_info.next_billing_time` only.
 * PayPal typically sets this to the end of the current paid cycle (no further charges).
 *
 * Do **not** use `last_payment.time` as access end — that is when the last charge posted,
 * often weeks in the past, and would cause Discord roles to drop immediately on cancel.
 */
export function getSubscriptionAccessEndFromPayPal(paypalSub: PayPalSubscription): Date | null {
  const next = paypalSub.billing_info?.next_billing_time;
  if (next) {
    const d = new Date(next);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Prefer the later of DB and PayPal so we never shorten paid access when merging sources. */
export function mergeSubscriptionAccessEnd(dbEnd: Date | null, paypalEnd: Date | null): Date | null {
  if (!dbEnd && !paypalEnd) return null;
  if (!dbEnd) return paypalEnd;
  if (!paypalEnd) return dbEnd;
  return new Date(Math.max(dbEnd.getTime(), paypalEnd.getTime()));
}

/** Cancel a subscription. */
export async function cancelSubscription(
  subscriptionId: string,
  reason: string
): Promise<void> {
  await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

/** Activate a suspended subscription. */
export async function activateSubscription(
  subscriptionId: string,
  reason: string = "Reactivating subscription"
): Promise<void> {
  await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/activate`, {
    method: "POST",
    body: { reason },
  });
}

// ---------------------------------------------------------------------------
// Orders (one-time payments for lifetime)
// ---------------------------------------------------------------------------

export type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { value: string; currency_code: string };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  links?: Array<{ href: string; rel: string }>;
};

/** Create a one-time order (for lifetime plans). */
export async function createOrder(params: {
  amount: string;
  description: string;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.customId,
          description: params.description,
          amount: {
            currency_code: "USD",
            value: params.amount,
          },
        },
      ],
      application_context: {
        brand_name: "6ure",
        locale: "en-US",
        landing_page: "NO_PREFERENCE",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    },
    headers: {
      "PayPal-Request-Id": `order-${params.customId}-${Math.floor(Date.now() / 60000)}`,
    },
  });
}

/** Capture (finalize) a one-time order. */
export async function captureOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
  });
}

/** Get order details. */
export async function getOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export type PayPalRefund = {
  id: string;
  status: string;
  amount?: { value: string; currency_code: string };
};

/** Refund a captured payment (saleId = capture ID). */
export async function refundPayment(
  captureId: string,
  amount?: string
): Promise<PayPalRefund> {
  const body: Record<string, unknown> = {};
  if (amount) {
    body.amount = { value: amount, currency_code: "USD" };
  }
  return paypalFetch<PayPalRefund>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: Object.keys(body).length > 0 ? body : undefined,
  });
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

export async function verifyWebhookSignature(params: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  try {
    const result = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: {
          auth_algo: params.authAlgo,
          cert_url: params.certUrl,
          transmission_id: params.transmissionId,
          transmission_sig: params.transmissionSig,
          transmission_time: params.transmissionTime,
          webhook_id: params.webhookId,
          webhook_event: params.webhookEvent,
        },
      }
    );
    return result.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[PayPal] Webhook verification failed:", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the approval URL from a PayPal response (subscription or order). */
export function getApprovalUrl(
  links: Array<{ href: string; rel: string }> | undefined
): string | null {
  if (!links?.length) return null;
  const approval =
    links.find((l) => l.rel === "approve") ??
    links.find((l) => l.rel === "payer-action");
  return approval?.href ?? null;
}

export { getLifetimePrice } from "@/lib/pricing";

export { BASE_URL, PAYPAL_MODE };
