import { NextRequest, NextResponse } from "next/server";
import { listSubscriptionsNeedingDiscordRoleRelease, cleanupStalePending } from "@/lib/dal/subscriptions";
import { releaseDiscordRoleIfSubscriptionAccessEnded } from "@/lib/subscription-role-on-cancel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET: remove Discord roles for cancelled or suspended subscriptions whose paid period has ended.
 * Requires ?key=CRON_SECRET. Example: hourly curl with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const secret = process.env.CRON_SECRET ?? "";

  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const expiredCount = await cleanupStalePending();
    const rows = await listSubscriptionsNeedingDiscordRoleRelease();
    let processed = 0;
    for (const sub of rows) {
      await releaseDiscordRoleIfSubscriptionAccessEnded(
        sub,
        sub.current_period_end ? new Date(sub.current_period_end) : null
      );
      processed += 1;
    }
    return NextResponse.json({ ok: true, processed, expiredPending: expiredCount });
  } catch (err) {
    console.error("[API] GET /api/cron/release-cancelled-subscription-roles:", err);
    return NextResponse.json(
      { error: "Cron failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
