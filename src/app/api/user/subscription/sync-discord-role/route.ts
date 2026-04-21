/**
 * POST /api/user/subscription/sync-discord-role
 * Assign the subscription's Discord role if the member is entitled but missing the role.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionById } from "@/lib/dal/subscriptions";
import { assignDiscordRoleToUser, fetchGuildMemberRoleIds } from "@/lib/discord-assign-role";
import { isSubscriptionEligibleForDiscordSync } from "@/lib/subscription-discord-sync-eligible";
import { getSubscriptionRoleId } from "@/lib/site-settings";
import { fetchDiscordUser, fetchGuildMemberForSync, syncRequestsUser } from "@/lib/sync-requests-user";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  const discordId = session?.user?.id;
  if (!discordId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: { subscriptionId?: string };
  try {
    body = (await request.json()) as { subscriptionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
  }

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub || sub.user_id !== session.user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (!isSubscriptionEligibleForDiscordSync(sub)) {
    return NextResponse.json(
      { error: "This subscription is not eligible for a Discord role right now." },
      { status: 400 }
    );
  }

  const roleId = await getSubscriptionRoleId(sub.plan_category);
  if (!roleId) {
    return NextResponse.json({ error: "Discord role is not configured for this plan." }, { status: 503 });
  }

  const roles = await fetchGuildMemberRoleIds(discordId);
  if (roles === null) {
    return NextResponse.json(
      {
        error:
          "We could not load your membership in the Discord server. Join the server with this Discord account, then try again.",
      },
      { status: 404 }
    );
  }

  if (roles.includes(roleId)) {
    const profile = await fetchDiscordUser(discordId);
    const member = await fetchGuildMemberForSync(discordId);
    if (profile) await syncRequestsUser(profile, member);
    return NextResponse.json({ ok: true, alreadyHasRole: true, assigned: false });
  }

  const result = await assignDiscordRoleToUser(discordId, roleId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Discord could not add the role." },
      { status: 502 }
    );
  }

  const profile = await fetchDiscordUser(discordId);
  const member = await fetchGuildMemberForSync(discordId);
  if (profile) await syncRequestsUser(profile, member);

  return NextResponse.json({ ok: true, alreadyHasRole: false, assigned: true });
}
