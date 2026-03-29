/**
 * POST /api/paypal/webhook
 * Handles PayPal webhook events for subscription lifecycle and payments.
 */

import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import { queryOne, execute } from "@/lib/db";
import {
  sendPaymentConfirmation,
  sendRefundNotification,
  sendCancellationConfirmation,
} from "@/lib/send-subscription-email";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    console.warn("[Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type as string;
  const resource = event.resource;

  console.log(`[Webhook] ${eventType}`, resource?.id);

  try {
    switch (eventType) {
      /* ---- Subscription activated ---- */
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const paypalSubId = resource.id;
        const payerEmail = resource.subscriber?.email_address ?? null;
        const payerName = resource.subscriber?.name
          ? `${resource.subscriber.name.given_name ?? ""} ${resource.subscriber.name.surname ?? ""}`.trim()
          : null;

        await execute(
          `UPDATE subscriptions
           SET status = 'ACTIVE',
               email = COALESCE(?, email),
               payer_name = COALESCE(?, payer_name),
               current_period_start = NOW(),
               updated_at = NOW()
           WHERE paypal_subscription_id = ?`,
          [payerEmail, payerName, paypalSubId]
        );

        // Increment promo code usage if applicable
        await execute(
          `UPDATE promo_codes pc
           JOIN subscriptions s ON s.promo_code_id = pc.id
           SET pc.used_count = pc.used_count + 1
           WHERE s.paypal_subscription_id = ?
             AND s.promo_code_id IS NOT NULL`,
          [paypalSubId]
        );

        break;
      }

      /* ---- Subscription cancelled / suspended / expired ---- */
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const paypalSubId = resource.id;
        const statusMap: Record<string, string> = {
          "BILLING.SUBSCRIPTION.CANCELLED": "CANCELLED",
          "BILLING.SUBSCRIPTION.SUSPENDED": "SUSPENDED",
          "BILLING.SUBSCRIPTION.EXPIRED": "EXPIRED",
        };
        const newStatus = statusMap[eventType] ?? "CANCELLED";

        const sub = await queryOne<{ id: string; email: string | null; plan_category: string; plan_interval: string }>(
          `SELECT id, email, plan_category, plan_interval FROM subscriptions WHERE paypal_subscription_id = ?`,
          [paypalSubId]
        );

        await execute(
          `UPDATE subscriptions SET status = ?, cancelled_at = NOW(), updated_at = NOW() WHERE paypal_subscription_id = ?`,
          [newStatus, paypalSubId]
        );

        // Send cancellation email
        if (sub?.email) {
          await sendCancellationConfirmation(sub.email, {
            planCategory: sub.plan_category,
            planInterval: sub.plan_interval,
          });
        }
        break;
      }

      /* ---- Payment completed (recurring) ---- */
      case "PAYMENT.SALE.COMPLETED": {
        const saleId = resource.id;
        const amount = resource.amount?.total ?? resource.amount?.value ?? "0";
        const paypalSubId = resource.billing_agreement_id ?? null;

        if (!paypalSubId) break; // Not a subscription payment

        const sub = await queryOne<{
          id: string;
          email: string | null;
          plan_category: string;
          plan_interval: string;
          payer_name: string | null;
        }>(
          `SELECT id, email, plan_category, plan_interval, payer_name FROM subscriptions WHERE paypal_subscription_id = ?`,
          [paypalSubId]
        );

        if (sub) {
          // Record payment
          const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          await execute(
            `INSERT INTO payments (id, subscription_id, paypal_sale_id, amount, currency, status, payer_email, payer_name, created_at)
             VALUES (?, ?, ?, ?, 'USD', 'COMPLETED', ?, ?, NOW())`,
            [paymentId, sub.id, saleId, amount, sub.email, sub.payer_name]
          );

          // Update subscription period
          await execute(
            `UPDATE subscriptions SET current_period_start = NOW(), updated_at = NOW() WHERE id = ?`,
            [sub.id]
          );

          // Send payment confirmation email
          if (sub.email) {
            await sendPaymentConfirmation(sub.email, {
              planCategory: sub.plan_category,
              planInterval: sub.plan_interval,
              amount: String(amount),
              transactionId: saleId,
              date: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            });
          }
        }
        break;
      }

      /* ---- Payment refunded ---- */
      case "PAYMENT.SALE.REFUNDED": {
        const refundAmount = resource.amount?.total ?? resource.amount?.value ?? "0";
        const saleId = resource.sale_id ?? null;

        if (saleId) {
          const payment = await queryOne<{
            id: string;
            subscription_id: string;
            amount: string;
            payer_email: string | null;
          }>(
            `SELECT p.id, p.subscription_id, p.amount, p.payer_email FROM payments p WHERE p.paypal_sale_id = ?`,
            [saleId]
          );

          if (payment) {
            const isFullRefund = parseFloat(refundAmount) >= parseFloat(payment.amount);
            await execute(
              `UPDATE payments SET status = ?, refund_amount = ?, refunded_at = NOW() WHERE id = ?`,
              [isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED", refundAmount, payment.id]
            );

            // Get subscription details for email
            const sub = await queryOne<{ plan_category: string; plan_interval: string }>(
              `SELECT plan_category, plan_interval FROM subscriptions WHERE id = ?`,
              [payment.subscription_id]
            );

            if (payment.payer_email && sub) {
              await sendRefundNotification(payment.payer_email, {
                planCategory: sub.plan_category,
                planInterval: sub.plan_interval,
                refundAmount: String(refundAmount),
                originalAmount: payment.amount,
                transactionId: saleId,
                date: new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              });
            }
          }
        }
        break;
      }

      /* ---- Subscription updated ---- */
      case "BILLING.SUBSCRIPTION.UPDATED": {
        const paypalSubId = resource.id;
        await execute(
          `UPDATE subscriptions SET updated_at = NOW() WHERE paypal_subscription_id = ?`,
          [paypalSubId]
        );
        break;
      }

      /* ---- Payment reversed (chargeback) ---- */
      case "PAYMENT.SALE.REVERSED": {
        const saleId = resource.sale_id ?? resource.id;
        await execute(
          `UPDATE payments SET status = 'REFUNDED', refund_amount = amount, refunded_at = NOW() WHERE paypal_sale_id = ?`,
          [saleId]
        );
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Error processing:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
