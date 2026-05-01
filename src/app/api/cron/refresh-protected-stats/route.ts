import { NextRequest, NextResponse } from "next/server";
import { refreshProtectedUsersStats } from "@/lib/protection-refresh-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET: refresh protected users stats (for cron). Call every 30 min.
 * Requires ?key=CRON_SECRET (set CRON_SECRET in .env).
 * Example cron: 0,30 * * * * curl -s "https://yoursite.com/api/cron/refresh-protected-stats?key=YOUR_CRON_SECRET"
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const secret = process.env.CRON_SECRET ?? "";

  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await refreshProtectedUsersStats();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API] GET /api/cron/refresh-protected-stats:", err);
    return NextResponse.json(
      { error: "Refresh failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
