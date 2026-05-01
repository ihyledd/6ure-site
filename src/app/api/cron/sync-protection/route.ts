import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { reconcileAllProtection } from "@/lib/protection-reconcile";

/**
 * GET/POST /api/cron/sync-protection
 *
 * Reconciles `is_protected` and `hidden` flags on `resources_items` against:
 *   - protected_users (creator name + social link)
 *   - protection_groups in /home/main/leak_protection_data.json (URLs + keywords)
 *
 * Auth: ?secret=<CRON_SECRET> | Authorization: Bearer <CRON_SECRET>, OR ADMIN session.
 */
async function run(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!expected || secret !== expected) {
    // Fall back to admin session.
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const stats = await reconcileAllProtection();
  return NextResponse.json({ success: true, ...stats });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
