import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSubscriptions } from "@/lib/dal/subscriptions";
import { assignDiscordRoleToUser } from "@/lib/discord-assign-role";
import { getSubscriptionRoleId } from "@/lib/site-settings";
import { isSubscriptionEligibleForDiscordSync } from "@/lib/subscription-discord-sync-eligible";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  try {
    const { rows: allRows } = await listSubscriptions({ limit: 10000 });
    const rows = allRows.filter(isSubscriptionEligibleForDiscordSync);
    
    console.log(`[BulkSync] Starting sync for ${rows.length} eligible users...`);

    let successCount = 0;
    let notInServerCount = 0;
    let errorCount = 0;
    const details: any[] = [];

    for (const sub of rows) {
      const roleId = await getSubscriptionRoleId(sub.plan_category);
      if (!roleId) {
        details.push({ userId: sub.user_id, status: "error", message: `No role mapping for ${sub.plan_category}` });
        errorCount++;
        continue;
      }
      
      const res = await assignDiscordRoleToUser(sub.user_id, roleId);
      
      if (res.ok) {
        successCount++;
        details.push({ userId: sub.user_id, status: "success" });
      } else {
        const err = res.error || "";
        if (err.includes("404")) {
          notInServerCount++;
          details.push({ userId: sub.user_id, status: "not_in_server" });
        } else {
          console.log(`[BulkSync] Error for user ${sub.user_id}: ${err}`);
          errorCount++;
          details.push({ userId: sub.user_id, status: "error", message: err });
        }
      }

      // Add a small delay to avoid Discord rate limits (Error 429)
      await sleep(1000);
    }

    const message = `Bulk sync completed: ${successCount} successful, ${notInServerCount} not in server, ${errorCount} errors.`;
    console.log(`[BulkSync] Finished: ${message}`);

    return NextResponse.json({ 
      success: true, 
      message,
      stats: { successCount, notInServerCount, errorCount },
      details
    });
  } catch (error) {
    console.error("[API] POST /api/admin/subscriptions/bulk-sync:", error);
    return NextResponse.json({ error: "Failed to bulk sync" }, { status: 500 });
  }
}
