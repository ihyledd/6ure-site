import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { refreshAllEmbeds } from "@/lib/requests-bot-api";

/** Staff only: trigger refresh of all Discord embeds via bot. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  refreshAllEmbeds();
  return NextResponse.json({ success: true, message: "Refresh started" });
}
