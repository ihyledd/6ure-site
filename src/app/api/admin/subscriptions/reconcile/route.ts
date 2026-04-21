/**
 * POST /api/admin/subscriptions/reconcile — Admin tool to recover missing subscriptions.
 * Fetches a PayPal subscription or order by ID, verifies it exists,
 * extracts custom_id + payer info, and creates the missing DB record.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscription as getPaypalSub, getOrder as getPaypalOrder, captureOrder } from "@/lib/paypal";
import {
  getSubscriptionByPaypalId,
  getSubscriptionByPaypalOrderId,
  createSubscription as dbCreateSub,
  createPayment,
  getPaymentByPaypalSaleId,
} from "@/lib/dal/subscriptions";
import { query, queryOne } from "@/lib/db";

function parseCustomId(customId: string | null | undefined): { userId: string; planCategory: string; planInterval: string } | null {
  if (!customId) return null;
  const parts = customId.split(":");
  if (parts.length >= 3) return { userId: parts[0], planCategory: parts[1], planInterval: parts[2] };
  return null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paypalId, type } = body as { paypalId: string; type: "subscription" | "order" };

    if (!paypalId) {
      return NextResponse.json({ error: "PayPal ID is required" }, { status: 400 });
    }

    if (type === "order") {
      const existing = await getSubscriptionByPaypalOrderId(paypalId);
      if (existing) {
        return NextResponse.json({ error: "This order already has a DB record", subscriptionId: existing.id }, { status: 409 });
      }

      let order = await getPaypalOrder(paypalId);

      if (order.status === "APPROVED") {
        order = await captureOrder(paypalId);
      }

      if (order.status !== "COMPLETED") {
        return NextResponse.json({ error: `Order status is ${order.status}, not COMPLETED. Cannot reconcile.` }, { status: 400 });
      }

      const unit = order.purchase_units?.[0] as Record<string, unknown> | undefined;
      const capture = order.purchase_units?.[0]?.payments?.captures?.[0] as Record<string, unknown> | undefined;
      const customId = (capture?.custom_id as string) ?? (unit?.custom_id as string) ?? null;
      const parsed = parseCustomId(customId);

      if (!parsed) {
        return NextResponse.json({ error: "No custom_id found on this order. Cannot determine the user." }, { status: 400 });
      }

      const amount = parseFloat((order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value) ?? "0");
      const payerEmail = order.payer?.email_address ?? null;
      const payerName = order.payer?.name ? `${order.payer.name.given_name ?? ""} ${order.payer.name.surname ?? ""}`.trim() : null;

      const user = await queryOne<{ username: string }>("SELECT username FROM users WHERE id = ?", [parsed.userId]);

      const newId = await dbCreateSub({
        userId: parsed.userId,
        paypalOrderId: paypalId,
        planCategory: parsed.planCategory,
        planInterval: "LIFETIME",
        status: "ACTIVE",
        amount,
        email: payerEmail,
        payerName,
      });

      const captureSaleId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
      let paymentCreated = false;
      if (captureSaleId) {
        const existingPayment = await getPaymentByPaypalSaleId(captureSaleId);
        if (!existingPayment) {
          await createPayment({
            subscriptionId: newId,
            paypalTransactionId: order.id,
            paypalSaleId: captureSaleId,
            amount,
            status: "COMPLETED",
            payerEmail,
            payerName,
          });
          paymentCreated = true;
        }
      } else {
        await createPayment({
          subscriptionId: newId,
          paypalTransactionId: order.id,
          paypalSaleId: `reconcile-order-${paypalId}`,
          amount,
          status: "COMPLETED",
          payerEmail,
          payerName,
        });
        paymentCreated = true;
      }

      return NextResponse.json({
        success: true,
        message: `Lifetime order reconciled — ${parsed.planCategory} for user ${parsed.userId}${paymentCreated ? ` ($${amount.toFixed(2)} payment recorded)` : ""}`,
        username: user?.username ?? null,
        subscriptionId: newId,
        paymentCreated,
        amount: paymentCreated ? amount : 0,
      });
    } else {
      const existing = await getSubscriptionByPaypalId(paypalId);
      if (existing) {
        return NextResponse.json({ error: "This subscription already has a DB record", subscriptionId: existing.id }, { status: 409 });
      }

      const paypalSub = await getPaypalSub(paypalId);
      const parsed = parseCustomId(paypalSub.custom_id);

      if (!parsed) {
        return NextResponse.json({ error: "No custom_id found on this subscription. Cannot determine the user. You may need to manually create the record." }, { status: 400 });
      }

      const isActive = paypalSub.status === "ACTIVE" || paypalSub.status === "APPROVED";
      const amount = parseFloat(paypalSub.billing_info?.last_payment?.amount?.value ?? "0");
      const payerEmail = paypalSub.subscriber?.email_address ?? null;
      const payerName = paypalSub.subscriber?.name ? `${paypalSub.subscriber.name.given_name ?? ""} ${paypalSub.subscriber.name.surname ?? ""}`.trim() : null;

      const user = await queryOne<{ username: string }>("SELECT username FROM users WHERE id = ?", [parsed.userId]);

      const newId = await dbCreateSub({
        userId: parsed.userId,
        paypalSubscriptionId: paypalId,
        planCategory: parsed.planCategory,
        planInterval: parsed.planInterval,
        status: isActive ? "ACTIVE" : paypalSub.status,
        amount: amount || 0,
        email: payerEmail,
        payerName,
      });

      let paymentCreated = false;
      if (amount > 0) {
        const lastPaymentTime = paypalSub.billing_info?.last_payment?.time;
        const saleId = `reconcile-sub-${paypalId}`;
        const existingPayment = await getPaymentByPaypalSaleId(saleId);
        if (!existingPayment) {
          await createPayment({
            subscriptionId: newId,
            paypalTransactionId: paypalId,
            paypalSaleId: saleId,
            amount,
            status: "COMPLETED",
            payerEmail,
            payerName,
          });
          paymentCreated = true;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Subscription reconciled — ${parsed.planCategory} ${parsed.planInterval} (${paypalSub.status}) for user ${parsed.userId}${paymentCreated ? ` ($${amount.toFixed(2)} payment recorded)` : ""}`,
        username: user?.username ?? null,
        subscriptionId: newId,
        paymentCreated,
        amount: paymentCreated ? amount : 0,
      });
    }
  } catch (error) {
    console.error("[API] POST /api/admin/subscriptions/reconcile:", error);
    const msg = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
