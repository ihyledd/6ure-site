/**
 * POST /api/user/subscription/cancel — Cancel user's own recurring subscription.
 * Optional win-back promo (20% monthly, account-locked) when eligible.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getSubscriptionById,
  updateSubscription,
  shouldOfferWinBackPromo,
  createWinBackPromoCode,
  logSubscriptionAction,
} from "@/lib/dal/subscriptions";
import {
  cancelSubscription,
  getSubscription,
  getSubscriptionAccessEndFromPayPal,
  mergeSubscriptionAccessEnd,
} from "@/lib/paypal";
import { releaseDiscordRoleIfSubscriptionAccessEnded } from "@/lib/subscription-role-on-cancel";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

type CancelBody = {
  subscriptionId: string;
  reason?: string;
  reasonCode?: string;
  reasonDetail?: string;
  intent?: "switch";
};

function buildCancelReasonPayload(body: CancelBody): Record<string, unknown> {
  if (body.intent === "switch") {
    return {
      intent: "switch",
      detail: typeof body.reasonDetail === "string" ? body.reasonDetail : undefined,
    };
  }
  if (body.reasonCode && typeof body.reasonCode === "string") {
    return {
      reasonCode: body.reasonCode,
      reasonDetail: typeof body.reasonDetail === "string" ? body.reasonDetail.trim() || undefined : undefined,
    };
  }
  if (body.reason && typeof body.reason === "string" && body.reason.trim()) {
    return { legacyText: body.reason.trim() };
  }
  return { legacyText: "User requested cancellation from account" };
}

function cancelReasonForDb(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "User requested cancellation";
  }
}

function paypalCancelNote(payload: Record<string, unknown>): string {
  if (payload.intent === "switch") return "Switching plans";
  const code = payload.reasonCode;
  if (typeof code === "string") {
    const detail = typeof payload.reasonDetail === "string" ? payload.reasonDetail.slice(0, 80) : "";
    return detail ? `${code}: ${detail}` : code;
  }
  const legacy = payload.legacyText;
  if (typeof legacy === "string") return legacy.slice(0, 120);
  return "User cancellation";
}

export async function POST(request: NextRequest) {
  // Rate limit: 3 per 5 minutes per IP
  const ip = getClientIp(request);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CancelBody;
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
    }

    const sub = await getSubscriptionById(subscriptionId);
    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (sub.user_id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (sub.status !== "ACTIVE" && sub.status !== "PENDING") {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
    }

    if (sub.plan_interval === "LIFETIME") {
      return NextResponse.json({ error: "Lifetime subscriptions cannot be cancelled via this endpoint" }, { status: 400 });
    }

    const reasonPayload = buildCancelReasonPayload(body);
    const reasonDb = cancelReasonForDb(reasonPayload);
    const paypalNote = paypalCancelNote(reasonPayload);

    const winBackCheck = await shouldOfferWinBackPromo({
      userId: session.user.id,
      subscription: sub,
      intent: body.intent,
    });

    let accessEnd: Date | null = sub.current_period_end ? new Date(sub.current_period_end) : null;

    if (sub.paypal_subscription_id) {
      await cancelSubscription(sub.paypal_subscription_id, paypalNote);
      try {
        const paypalSub = await getSubscription(sub.paypal_subscription_id);
        const parsed = getSubscriptionAccessEndFromPayPal(paypalSub);
        accessEnd = mergeSubscriptionAccessEnd(accessEnd, parsed);
      } catch (e) {
        console.error("[API] cancel: getSubscription after cancel failed:", e);
      }
    }

    await updateSubscription(sub.id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reasonDb,
      currentPeriodEnd: accessEnd,
    });

    await logSubscriptionAction({
      subscriptionId: sub.id,
      userId: session.user.id,
      action: "MANUAL_CANCEL",
      details: { reasonCode: body.reasonCode, reasonDetail: body.reasonDetail },
    });

    const refreshed = await getSubscriptionById(sub.id);
    if (refreshed) {
      await releaseDiscordRoleIfSubscriptionAccessEnded(refreshed, accessEnd);
    }

    let winbackCode: string | undefined;
    let winbackExpiresAt: string | undefined;

    if (winBackCheck.offer && (sub.plan_category === "PREMIUM" || sub.plan_category === "LEAK_PROTECTION")) {
      try {
        const created = await createWinBackPromoCode({
          userId: session.user.id,
          planCategory: sub.plan_category as "PREMIUM" | "LEAK_PROTECTION",
          subscriptionId: sub.id,
          eligibilityReason: winBackCheck.reason,
        });
        winbackCode = created.code;
        winbackExpiresAt = created.validUntil.toISOString();
      } catch (e) {
        console.error("[API] Win-back promo creation failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      accessEndsAt: accessEnd?.toISOString() ?? null,
      winbackOffered: Boolean(winbackCode),
      winbackCode,
      winbackExpiresAt,
      winbackEligibilityReason: winBackCheck.reason,
    });
  } catch (error) {
    console.error("[API] POST /api/user/subscription/cancel:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
