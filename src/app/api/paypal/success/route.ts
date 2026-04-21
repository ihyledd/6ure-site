/**
 * GET /api/paypal/success — Post-checkout redirect handler
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { captureOrder, getSubscription } from "@/lib/paypal";
import { queryOne, execute } from "@/lib/db";
import { sendPaymentConfirmation } from "@/lib/send-subscription-email";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://6ureleaks.com";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(`${SITE_URL}/membership?error=auth`);

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const category = url.searchParams.get("category");
  const interval = url.searchParams.get("interval");
  const token = url.searchParams.get("token");
  const subscriptionId = url.searchParams.get("subscription_id");

  try {
    if (type === "lifetime" && token) {
      const capture = await captureOrder(token);
      const captureId = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
      const payerEmail = capture?.payer?.email_address ?? null;
      const payerName = capture?.payer?.name ? `${capture.payer.name.given_name ?? ""} ${capture.payer.name.surname ?? ""}`.trim() : null;

      const sub = await queryOne<{ id: string; amount: string; plan_category: string }>(
        `SELECT id, amount, plan_category FROM subscriptions WHERE paypal_order_id = ? AND user_id = ?`, [token, session.user.id]
      );
      if (sub) {
        await execute(`UPDATE subscriptions SET status = 'ACTIVE', email = ?, payer_name = ?, current_period_start = NOW(), updated_at = NOW() WHERE id = ?`, [payerEmail, payerName, sub.id]);
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await execute(
          `INSERT INTO payments (id, subscription_id, paypal_transaction_id, paypal_sale_id, amount, currency, status, payer_email, payer_name, created_at) VALUES (?, ?, ?, ?, ?, 'USD', 'COMPLETED', ?, ?, NOW())`,
          [paymentId, sub.id, token, captureId, sub.amount, payerEmail, payerName]
        );
        await execute(`UPDATE promo_codes pc JOIN subscriptions s ON s.promo_code_id = pc.id SET pc.used_count = pc.used_count + 1 WHERE s.id = ? AND s.promo_code_id IS NOT NULL`, [sub.id]);
        if (payerEmail) {
          await sendPaymentConfirmation(payerEmail, {
            planCategory: sub.plan_category, planInterval: "LIFETIME", amount: sub.amount,
            transactionId: captureId ?? token,
            date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          });
        }
      }
      return NextResponse.redirect(`${SITE_URL}/membership?success=true&category=${category}&interval=LIFETIME`);
    }

    if (type === "subscription" && subscriptionId) {
      const details = await getSubscription(subscriptionId);
      const payerEmail = details?.subscriber?.email_address ?? null;
      const payerName = details?.subscriber?.name ? `${details.subscriber.name.given_name ?? ""} ${details.subscriber.name.surname ?? ""}`.trim() : null;
      if (details.status === "ACTIVE" || details.status === "APPROVED") {
        await execute(
          `UPDATE subscriptions SET status = 'ACTIVE', email = COALESCE(?, email), payer_name = COALESCE(?, payer_name), current_period_start = NOW(), updated_at = NOW() WHERE paypal_subscription_id = ? AND user_id = ?`,
          [payerEmail, payerName, subscriptionId, session.user.id]
        );
        await execute(`UPDATE promo_codes pc JOIN subscriptions s ON s.promo_code_id = pc.id SET pc.used_count = pc.used_count + 1 WHERE s.paypal_subscription_id = ? AND s.promo_code_id IS NOT NULL`, [subscriptionId]);
      }
      return NextResponse.redirect(`${SITE_URL}/membership?success=true&category=${category}&interval=${interval}`);
    }

    return NextResponse.redirect(`${SITE_URL}/membership?error=unknown`);
  } catch (err) {
    console.error("[PayPal Success]", err);
    return NextResponse.redirect(`${SITE_URL}/membership?error=processing`);
  }
}
