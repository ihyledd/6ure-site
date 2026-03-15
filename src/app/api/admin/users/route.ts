import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listUsersForAdmin } from "@/lib/dal/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listUsersForAdmin();
    return NextResponse.json(users);
  } catch (err) {
    console.error("[API] GET /api/admin/users:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

