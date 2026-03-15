import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createManualUpdate } from "@/lib/dal/wiki-home";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await request.json() as { title?: string; body?: string };
  const { title, body: bodyText } = data;
  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Title required" }, { status: 400 });
  }
  await createManualUpdate({ title: title.trim(), body: bodyText?.trim() || null });
  return Response.json({ ok: true });
}
