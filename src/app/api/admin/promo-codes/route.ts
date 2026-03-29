/**
 * GET/POST /api/admin/promo-codes — Promo code management (developer only)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, execute } from "@/lib/db";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const codes = await query(`SELECT pc.*, (SELECT COUNT(*) FROM subscriptions s WHERE s.promo_code_id = pc.id) as total_uses FROM promo_codes pc ORDER BY pc.created_at DESC`);
  return NextResponse.json({ codes });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { code, discountPercent, maxUses, validFrom, validUntil, planCategory } = await request.json();
  if (!code || !discountPercent) return NextResponse.json({ error: "Code and discount required" }, { status: 400 });
  if (discountPercent < 1 || discountPercent > 100) return NextResponse.json({ error: "Discount must be 1-100" }, { status: 400 });

  const id = `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await execute(
    `INSERT INTO promo_codes (id, code, discount_percent, max_uses, valid_from, valid_until, plan_category, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [id, code.toUpperCase(), discountPercent, maxUses ?? null, validFrom ?? null, validUntil ?? null, planCategory ?? null]
  );
  return NextResponse.json({ success: true, id });
}
