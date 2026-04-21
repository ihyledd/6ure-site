/**
 * GET /api/paypal/callback — PayPal redirects here after user approves payment.
 * Handles both subscription and lifetime (one-time) flows.
 * Creates the DB subscription record on-the-fly if one doesn't exist yet
 * (since checkout routes no longer pre-create PENDING records).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getSubscription as getPaypalSub,
  captureOrder,
  cancelSubscription,
} from "@/lib/paypal";
import {
  getSubscriptionByPaypalId,
  getSubscriptionByPaypalOrderId,
  createSubscription as dbCreateSub,
  updateSubscription,
  createPayment,
  getMigrationEligibility,
  recordMigrationDiscount,
  getActiveSubscription,
} from "@/lib/dal/subscriptions";
import { getPlanPrice } from "@/lib/pricing";
import { assignDiscordRoleToUser } from "@/lib/discord-assign-role";
import { sendPaymentConfirmation } from "@/lib/send-subscription-email";
import { getSubscriptionRoleId } from "@/lib/site-settings";

const BASE_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

function getPlanLabel(planCategory: string): string {
  return planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
}

function parseCustomId(customId: string | null | undefined): { userId: string; planCategory: string; planInterval: string } | null {
  if (!customId) return null;
  const parts = customId.split(":");
  if (parts.length >= 3) return { userId: parts[0], planCategory: parts[1], planInterval: parts[2] };
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "subscription";

  try {
    if (type === "lifetime") {
      const token = searchParams.get("token");
      if (!token) {
        return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=missing_token`);
      }

      const captured = await captureOrder(token);
      if (captured.status !== "COMPLETED") {
        return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=payment_not_completed`);
      }

      const payerEmail = captured.payer?.email_address ?? null;
      const payerName = captured.payer?.name
        ? `${captured.payer.name.given_name ?? ""} ${captured.payer.name.surname ?? ""}`.trim()
        : null;

      let sub = await getSubscriptionByPaypalOrderId(token);

      if (!sub) {
        const captureResource = captured.purchase_units?.[0]?.payments?.captures?.[0] as Record<string, unknown> | undefined;
        const unitResource = captured.purchase_units?.[0] as Record<string, unknown> | undefined;
        const customId = (captureResource?.custom_id as string | undefined)
          ?? (unitResource?.custom_id as string | undefined);
        const parsed = parseCustomId(customId);
        if (!parsed) {
          console.error("[PayPal Callback] No subscription and no custom_id for order:", token);
          return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=subscription_not_found`);
        }

        const captureData = captured.purchase_units?.[0]?.payments?.captures?.[0];
        const amount = parseFloat(captureData?.amount?.value ?? "0");

        const newId = await dbCreateSub({
          userId: parsed.userId,
          paypalOrderId: token,
          planCategory: parsed.planCategory,
          planInterval: "LIFETIME",
          status: "ACTIVE",
          amount,
          email: payerEmail,
          payerName,
        });

        await createPayment({
          subscriptionId: newId,
          paypalTransactionId: captured.id,
          paypalSaleId: captureData?.id ?? null,
          amount,
          status: "COMPLETED",
          payerEmail,
          payerName,
        });

        const roleId = await getSubscriptionRoleId(parsed.planCategory);
        if (roleId) {
          const result = await assignDiscordRoleToUser(parsed.userId, roleId);
          if (!result.ok) console.error("[PayPal Callback] Role assign failed:", result.error);
        }

        try {
          const migration = await getMigrationEligibility(parsed.userId, parsed.planCategory);
          if (migration.eligible) {
            const originalPrice = getPlanPrice(parsed.planCategory as "PREMIUM" | "LEAK_PROTECTION", "LIFETIME");
            await recordMigrationDiscount({
              userId: parsed.userId,
              planCategory: parsed.planCategory,
              discountAmount: originalPrice * (migration.discountPercent / 100),
              originalPrice,
              finalPrice: amount,
              paypalId: token,
            });
          }
        } catch (e) {
          console.error("[PayPal Callback] Migration discount record failed:", e);
        }

        if (payerEmail) {
          sendPaymentConfirmation(payerEmail, getPlanLabel(parsed.planCategory), String(amount), "Lifetime")
            .catch((e) => console.error("[PayPal Callback] Email failed:", e));
        }

        return NextResponse.redirect(
          `${BASE_URL}/membership?status=success&plan=${parsed.planCategory}&interval=LIFETIME`
        );
      }

      await updateSubscription(sub.id, {
        status: "ACTIVE",
        email: payerEmail,
        payerName,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
      });

      const captureData = captured.purchase_units?.[0]?.payments?.captures?.[0];
      await createPayment({
        subscriptionId: sub.id,
        paypalTransactionId: captured.id,
        paypalSaleId: captureData?.id ?? null,
        amount: parseFloat(captureData?.amount?.value ?? String(sub.amount)),
        status: "COMPLETED",
        payerEmail,
        payerName,
      });

      const lifetimeRoleId = await getSubscriptionRoleId(sub.plan_category);
      if (lifetimeRoleId) {
        const result = await assignDiscordRoleToUser(sub.user_id, lifetimeRoleId);
        if (!result.ok) console.error("[PayPal Callback] Role assign failed:", result.error);
      }

      if (payerEmail) {
        sendPaymentConfirmation(payerEmail, getPlanLabel(sub.plan_category), String(sub.amount), "Lifetime")
          .catch((e) => console.error("[PayPal Callback] Email failed:", e));
      }

      return NextResponse.redirect(
        `${BASE_URL}/membership?status=success&plan=${sub.plan_category}&interval=LIFETIME`
      );
    } else {
      const subscriptionId = searchParams.get("subscription_id");
      if (!subscriptionId) {
        return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=missing_subscription_id`);
      }

      const paypalSub = await getPaypalSub(subscriptionId);

      const payerEmail = paypalSub.subscriber?.email_address ?? null;
      const payerName = paypalSub.subscriber?.name
        ? `${paypalSub.subscriber.name.given_name ?? ""} ${paypalSub.subscriber.name.surname ?? ""}`.trim()
        : null;
      const isActive = paypalSub.status === "ACTIVE" || paypalSub.status === "APPROVED";

      let sub = await getSubscriptionByPaypalId(subscriptionId);

      if (!sub) {
        const parsed = parseCustomId(paypalSub.custom_id);
        if (!parsed) {
          console.error("[PayPal Callback] No subscription and no custom_id for PayPal ID:", subscriptionId);
          return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=subscription_not_found`);
        }

        if (isActive) {
          const existingActive = await getActiveSubscription(parsed.userId, parsed.planCategory);
          if (existingActive && existingActive.paypal_subscription_id !== subscriptionId) {
            console.error(`[PayPal Callback] Duplicate subscription detected for user ${parsed.userId}. Cancelling new sub ${subscriptionId}`);
            try {
              await cancelSubscription(subscriptionId, "Duplicate subscription detected by system.");
            } catch (e) {
              console.error("[PayPal Callback] Failed to auto-cancel duplicate:", e);
            }
            return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=duplicate_subscription_auto_cancelled`);
          }
        }

        const amount = parseFloat(paypalSub.billing_info?.last_payment?.amount?.value ?? "0");

        const newId = await dbCreateSub({
          userId: parsed.userId,
          paypalSubscriptionId: subscriptionId,
          planCategory: parsed.planCategory,
          planInterval: parsed.planInterval,
          status: isActive ? "ACTIVE" : paypalSub.status,
          amount: amount || 0,
          email: payerEmail,
          payerName,
        });

        // First charge is recorded by PAYMENT.SALE.COMPLETED webhook (real paypal_sale_id).
        // Do not insert a synthetic callback-* row or it duplicates the webhook payment.

        if (isActive) {
          const roleId = await getSubscriptionRoleId(parsed.planCategory);
          if (roleId) {
            const result = await assignDiscordRoleToUser(parsed.userId, roleId);
            if (!result.ok) console.error("[PayPal Callback] Role assign failed:", result.error);
          }

          try {
            const migration = await getMigrationEligibility(parsed.userId, parsed.planCategory);
            if (migration.eligible) {
              const originalPrice = getPlanPrice(
                parsed.planCategory as "PREMIUM" | "LEAK_PROTECTION",
                parsed.planInterval as "MONTHLY" | "YEARLY"
              );
              await recordMigrationDiscount({
                userId: parsed.userId,
                planCategory: parsed.planCategory,
                discountAmount: originalPrice * (migration.discountPercent / 100),
                originalPrice,
                finalPrice: amount || originalPrice * (1 - migration.discountPercent / 100),
                paypalId: subscriptionId,
              });
            }
          } catch (e) {
            console.error("[PayPal Callback] Migration discount record failed:", e);
          }

          if (payerEmail) {
            sendPaymentConfirmation(
              payerEmail,
              getPlanLabel(parsed.planCategory),
              String(amount),
              parsed.planInterval === "MONTHLY" ? "Monthly" : "Yearly"
            ).catch((e) => console.error("[PayPal Callback] Email failed:", e));
          }
        }

        return NextResponse.redirect(
          `${BASE_URL}/membership?status=success&plan=${parsed.planCategory}&interval=${parsed.planInterval}`
        );
      }

      await updateSubscription(sub.id, {
        status: isActive ? "ACTIVE" : paypalSub.status,
        email: payerEmail,
        payerName,
        currentPeriodStart: paypalSub.billing_info?.last_payment?.time
          ? new Date(paypalSub.billing_info.last_payment.time)
          : new Date(),
        currentPeriodEnd: paypalSub.billing_info?.next_billing_time
          ? new Date(paypalSub.billing_info.next_billing_time)
          : null,
      });

      if (isActive) {
        const subRoleId = await getSubscriptionRoleId(sub.plan_category);
        if (subRoleId) {
          const result = await assignDiscordRoleToUser(sub.user_id, subRoleId);
          if (!result.ok) console.error("[PayPal Callback] Role assign failed:", result.error);
        }
      }

      if (payerEmail && isActive) {
        sendPaymentConfirmation(
          payerEmail,
          getPlanLabel(sub.plan_category),
          String(sub.amount),
          sub.plan_interval === "MONTHLY" ? "Monthly" : "Yearly"
        ).catch((e) => console.error("[PayPal Callback] Email failed:", e));
      }

      return NextResponse.redirect(
        `${BASE_URL}/membership?status=success&plan=${sub.plan_category}&interval=${sub.plan_interval}`
      );
    }
  } catch (error) {
    console.error("[API] GET /api/paypal/callback:", error);
    return NextResponse.redirect(`${BASE_URL}/membership?status=error&message=internal_error`);
  }
}
