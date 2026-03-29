import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { setSiteSetting } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json() as { discord_url?: string | null };
  const value = body.discord_url && body.discord_url.trim() ? body.discord_url.trim() : "";
  await setSiteSetting("discord_url", value);
  return Response.json({ ok: true });
}
