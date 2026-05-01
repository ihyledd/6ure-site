import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { execute, queryOne } from "@/lib/db";

/**
 * GET /api/leaker/payout-settings — returns the signed-in user's payout settings.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const row = await queryOne<{ paypal_email: string | null; payout_method: string | null }>(
    "SELECT paypal_email, payout_method FROM users WHERE id = ?",
    [session.user.id]
  );
  return NextResponse.json({
    paypal_email: row?.paypal_email ?? null,
    payout_method: row?.payout_method ?? "paypal",
  });
}

/**
 * PATCH /api/leaker/payout-settings — body { paypal_email?, payout_method? }
 * Only PayPal is supported as a payout method right now; other values are rejected.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sets: string[] = [];
  const values: any[] = [];

  if ("paypal_email" in body) {
    const email = body.paypal_email == null ? null : String(body.paypal_email).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid PayPal email format" }, { status: 400 });
    }
    sets.push("paypal_email = ?");
    values.push(email || null);
  }

  if ("payout_method" in body) {
    const method = String(body.payout_method || "paypal").trim().toLowerCase();
    if (method !== "paypal") {
      return NextResponse.json(
        { error: "Only PayPal is supported as a payout method right now." },
        { status: 400 }
      );
    }
    sets.push("payout_method = ?");
    values.push(method);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...values, session.user.id]);
  return NextResponse.json({ success: true });
}
