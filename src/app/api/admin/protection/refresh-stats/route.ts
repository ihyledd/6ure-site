import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { refreshProtectedUsersStats } from "@/lib/protection-refresh-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST: refresh follower/video stats for all protected users with social links (admin only). */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshProtectedUsersStats();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API] POST /api/admin/protection/refresh-stats:", err);
    return NextResponse.json(
      { error: "Refresh failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
