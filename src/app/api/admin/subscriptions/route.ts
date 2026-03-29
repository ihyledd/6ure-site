/**
 * GET /api/admin/subscriptions — List all subscriptions
 * Developer-only.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query } from "@/lib/db";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (status) {
    where += " AND s.status = ?";
    params.push(status);
  }
  if (category) {
    where += " AND s.plan_category = ?";
    params.push(category);
  }
  if (search) {
    where += " AND (u.username LIKE ? OR s.email LIKE ? OR s.payer_name LIKE ? OR u.global_name LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Count total
  const countParams = [...params];
  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM subscriptions s
     LEFT JOIN users u ON u.id = s.user_id
     ${where}`,
    countParams
  );

  // Get subscriptions with user info
  params.push(String(limit), String(offset));
  const subscriptions = await query(
    `SELECT s.*, u.username, u.global_name, u.display_name, u.avatar, u.guild_avatar, u.guild_nickname,
            (SELECT COUNT(*) FROM payments p WHERE p.subscription_id = s.id) as payment_count,
            (SELECT SUM(p.amount) FROM payments p WHERE p.subscription_id = s.id AND p.status = 'COMPLETED') as total_paid
     FROM subscriptions s
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );

  return NextResponse.json({
    subscriptions,
    total: countRow?.total ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countRow?.total ?? 0) / limit),
  });
}
