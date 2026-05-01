/**
 * POST /api/paypal/webhook — Handle PayPal webhook events.
 * Events: subscription activated/cancelled/suspended, payment completed/refunded.
 * Logs every event to webhook_events table for debugging.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  getSubscription,
  getSubscriptionAccessEndFromPayPal,
  mergeSubscriptionAccessEnd,
  cancelSubscription,
} from "@/lib/paypal";
import { releaseDiscordRoleIfSubscriptionAccessEnded } from "@/lib/subscription-role-on-cancel";
import {
  getSubscriptionByPaypalId,
  updateSubscription,
  createPayment,
  getPaymentByPaypalSaleId,
  updatePaymentRefund,
  logWebhookEvent,
  logSubscriptionAction,
  getActiveSubscription,
} from "@/lib/dal/subscriptions";
import { assignDiscordRoleToUser } from "@/lib/discord-assign-role";
import { getSubscriptionRoleId } from "@/lib/site-settings";
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from "@/lib/emails";
import { queryOne } from "@/lib/db";

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? "";

async function getUserEmail(discordId: string, fallbackEmail: string | null): Promise<string | null> {
  try {
    const row = await queryOne<{ email: string }>(
      `SELECT u.email FROM Account a JOIN User u ON a.userId = u.id WHERE a.providerAccountId = ? AND a.provider = 'discord' LIMIT 1`,
      [discordId]
    );
    return row?.email || fallbackEmail;
  } catch (e) {
    console.error("[getUserEmail] Error fetching email:", e);
    return fallbackEmail;
  }
}

async function getUsername(discordId: string): Promise<string> {
  try {
    const row = await queryOne<{ username: string }>(
      `SELECT username FROM users WHERE id = ? LIMIT 1`,
      [discordId]
    );
    return row?.username || "Subscriber";
  } catch {
    return "Subscriber";
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody) as {
      id?: string;
      event_type: string;
      resource: Record<string, unknown>;
    };

    // Verify webhook signature
    const verified = await verifyWebhookSignature({
      authAlgo: request.headers.get("paypal-auth-algo") ?? "",
      certUrl: request.headers.get("paypal-cert-url") ?? "",
      transmissionId: request.headers.get("paypal-transmission-id") ?? "",
      transmissionSig: request.headers.get("paypal-transmission-sig") ?? "",
      transmissionTime: request.headers.get("paypal-transmission-time") ?? "",
      webhookId: WEBHOOK_ID,
      webhookEvent: event,
    });

    if (!verified) {
      console.warn("[PayPal Webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[PayPal Webhook] Event:", event.event_type);

    // Log the event and check for idempotency
    const isNewEvent = await logWebhookEvent({
      eventId: event.id ?? `evt_${Date.now()}`,
      eventType: event.event_type,
      resourceId: (event.resource.id as string) ?? null,
      payload: rawBody,
    }).catch((e) => {
      console.error("[PayPal Webhook] Event logging failed:", e);
      return true; // proceed if logging fails just in case
    });

    if (!isNewEvent) {
      console.log(`[PayPal Webhook] Skipping duplicate event ${event.id}`);
      return NextResponse.json({ ok: true, note: "duplicate skipped" });
    }

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const paypalSubId = event.resource.id as string;
        const sub = await getSubscriptionByPaypalId(paypalSubId);

        // Duplicate/orphan detection
        let isDuplicate = false;
        let userIdForDup: string | undefined;

        if (!sub) {
          // If not in DB, it might be an orphaned duplicate where they closed the tab before the callback.
          try {
            const paypalSub = await getSubscription(paypalSubId);
            const customId = paypalSub.custom_id;
            if (customId) {
              const parts = customId.split(":");
              if (parts.length >= 3) {
                const userId = parts[0];
                const planCategory = parts[1];
                const existing = await getActiveSubscription(userId, planCategory);
                if (existing) {
                  isDuplicate = true;
                  userIdForDup = userId;
                }
              }
            }
          } catch (e) {
            console.error("[Webhook ACTIVATED] Failed to fetch paypal sub for orphan check:", e);
          }
        } else {
          // If in DB, ensure it's not a duplicate of ANOTHER active subscription
          const existing = await getActiveSubscription(sub.user_id, sub.plan_category);
          if (existing && existing.paypal_subscription_id !== paypalSubId) {
            isDuplicate = true;
            userIdForDup = sub.user_id;
          }
        }

        if (isDuplicate) {
          console.error(`[Webhook ACTIVATED] Duplicate subscription ${paypalSubId} detected for user ${userIdForDup}. Auto-cancelling.`);
          try {
            await cancelSubscription(paypalSubId, "Duplicate subscription detected by webhook system.");
          } catch (e) {
            console.error("[Webhook ACTIVATED] Failed to auto-cancel duplicate:", e);
          }
          break; // Stop processing this subscription
        }

        if (!sub) break;

        await updateSubscription(sub.id, { status: "ACTIVE" });

        await logSubscriptionAction({
          subscriptionId: sub.id,
          userId: sub.user_id,
          action: "WEBHOOK_ACTIVATED",
          details: { paypalSubId },
        });

        const roleId = await getSubscriptionRoleId(sub.plan_category);
        if (roleId) {
          const result = await assignDiscordRoleToUser(sub.user_id, roleId);
          if (!result.ok) console.error(`[Webhook ACTIVATED] Role assign failed for user=${sub.user_id}:`, result.error);
        }

        const email = await getUserEmail(sub.user_id, sub.email);
        if (email) {
          const username = await getUsername(sub.user_id);
          await sendSubscriptionActivatedEmail(
            { email, username },
            { planName: sub.plan_category, interval: sub.plan_interval }
          ).catch((e) => console.error("[Email Failed]", e));
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const paypalSubId = event.resource.id as string;
        const sub = await getSubscriptionByPaypalId(paypalSubId);
        if (!sub) break;

        let accessEnd: Date | null = sub.current_period_end ? new Date(sub.current_period_end) : null;
        try {
          const paypalSub = await getSubscription(paypalSubId);
          const parsed = getSubscriptionAccessEndFromPayPal(paypalSub);
          accessEnd = mergeSubscriptionAccessEnd(accessEnd, parsed);
        } catch (e) {
          console.error("[PayPal Webhook CANCELLED] getSubscription failed:", e);
        }

        await updateSubscription(sub.id, {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: (event.resource.status_change_note as string) ?? "Cancelled via PayPal",
          currentPeriodEnd: accessEnd,
        });

        await logSubscriptionAction({
          subscriptionId: sub.id,
          userId: sub.user_id,
          action: "WEBHOOK_CANCELLED",
          details: { paypalSubId, accessEnd: accessEnd?.toISOString() },
        });

        const email = await getUserEmail(sub.user_id, sub.email);
        if (email) {
          const username = await getUsername(sub.user_id);
          await sendSubscriptionCancelledEmail(
            { email, username },
            { planName: sub.plan_category, interval: sub.plan_interval }
          ).catch((e) => console.error("[Email Failed]", e));
        }

        const refreshed = await getSubscriptionByPaypalId(paypalSubId);
        if (refreshed) {
          await releaseDiscordRoleIfSubscriptionAccessEnded(refreshed, accessEnd);
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const paypalSubId = event.resource.id as string;
        const sub = await getSubscriptionByPaypalId(paypalSubId);
        if (!sub) break;

        let accessEnd: Date | null = sub.current_period_end ? new Date(sub.current_period_end) : null;
        try {
          const paypalSub = await getSubscription(paypalSubId);
          const parsed = getSubscriptionAccessEndFromPayPal(paypalSub);
          accessEnd = mergeSubscriptionAccessEnd(accessEnd, parsed);
        } catch (e) {
          console.error("[PayPal Webhook SUSPENDED] getSubscription failed:", e);
        }

        await updateSubscription(sub.id, {
          status: "SUSPENDED",
          currentPeriodEnd: accessEnd,
        });

        await logSubscriptionAction({
          subscriptionId: sub.id,
          userId: sub.user_id,
          action: "WEBHOOK_SUSPENDED",
          details: { paypalSubId, accessEnd: accessEnd?.toISOString() },
        });

        const email = await getUserEmail(sub.user_id, sub.email);
        if (email) {
          const username = await getUsername(sub.user_id);
          await sendPaymentFailedEmail(
            { email, username },
            { planName: sub.plan_category, interval: sub.plan_interval }
          ).catch((e) => console.error("[Email Failed]", e));
        }

        const refreshed = await getSubscriptionByPaypalId(paypalSubId);
        if (refreshed) {
          await releaseDiscordRoleIfSubscriptionAccessEnded(refreshed, accessEnd);
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        const billingAgreementId = event.resource.billing_agreement_id as string | undefined;
        if (!billingAgreementId) break;

        const sub = await getSubscriptionByPaypalId(billingAgreementId);
        if (!sub) break;

        const amount = (event.resource.amount as { total?: string; value?: string })?.total
          ?? (event.resource.amount as { value?: string })?.value ?? "0";
        const saleId = event.resource.id as string;

        const existing = await getPaymentByPaypalSaleId(saleId);
        if (existing) break;

        await createPayment({
          subscriptionId: sub.id,
          paypalTransactionId: billingAgreementId,
          paypalSaleId: saleId,
          amount: parseFloat(amount),
          status: "COMPLETED",
          payerEmail: (event.resource.payer_email ?? event.resource.email) as string | null,
        });

        // Ensure subscription is active
        if (sub.status !== "ACTIVE") {
          await updateSubscription(sub.id, { status: "ACTIVE" });
        }

        // Fallback role assignment — safety net if callback missed it
        const saleRoleId = await getSubscriptionRoleId(sub.plan_category);
        if (saleRoleId) {
          const roleResult = await assignDiscordRoleToUser(sub.user_id, saleRoleId);
          if (!roleResult.ok) {
            console.error(`[Webhook PAYMENT.SALE.COMPLETED] Role assign failed for user=${sub.user_id} role=${saleRoleId}:`, roleResult.error);
          }
        }

        const nextBilling = event.resource.billing_info as { next_billing_time?: string } | undefined;
        if (nextBilling?.next_billing_time) {
          await updateSubscription(sub.id, {
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(nextBilling.next_billing_time),
          });
        }
        break;
      }

      case "PAYMENT.SALE.REFUNDED":
      case "PAYMENT.SALE.REVERSED": {
        const saleId = event.resource.sale_id as string | undefined;
        if (!saleId) break;

        const payment = await getPaymentByPaypalSaleId(saleId);
        if (!payment) break;

        const refundAmount = (event.resource.amount as { total?: string; value?: string })?.total
          ?? (event.resource.amount as { value?: string })?.value ?? "0";

        await updatePaymentRefund(payment.id, {
          refundAmount: parseFloat(refundAmount),
          refundReason: "Refunded via PayPal",
        });
        break;
      }

      default:
        console.log("[PayPal Webhook] Unhandled event:", event.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[API] POST /api/paypal/webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
