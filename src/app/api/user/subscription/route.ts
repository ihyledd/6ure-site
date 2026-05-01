/**
 * GET /api/user/subscription — Get the current user's subscriptions and payment history.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSubscriptions, getPaymentsBySubscription } from "@/lib/dal/subscriptions";
import { fetchGuildMemberRoleIds } from "@/lib/discord-assign-role";
import { getSubscriptionRoleId } from "@/lib/site-settings";
import { apiLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const ip = getClientIp(request);
  const { success, reset } = apiLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const subscriptions = await getUserSubscriptions(session.user.id);

    const memberRoles = await fetchGuildMemberRoleIds(session.user.id);
    const [premiumRoleId, lpRoleId] = await Promise.all([
      getSubscriptionRoleId("PREMIUM"),
      getSubscriptionRoleId("LEAK_PROTECTION"),
    ]);

    const subsWithPayments = await Promise.all(
      subscriptions.map(async (sub) => {
        const payments = await getPaymentsBySubscription(sub.id);
        let discordRolePresent: boolean | null = null;
        if (
          memberRoles !== null &&
          (sub.plan_category === "PREMIUM" || sub.plan_category === "LEAK_PROTECTION")
        ) {
          const rid = sub.plan_category === "PREMIUM" ? premiumRoleId : lpRoleId;
          discordRolePresent = Boolean(rid && memberRoles.includes(rid));
        }
        return { ...sub, payments, discordRolePresent };
      })
    );

    return NextResponse.json({ 
      subscriptions: subsWithPayments,
      roles: memberRoles || []
    });
  } catch (error) {
    console.error("[API] GET /api/user/subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
