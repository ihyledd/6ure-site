import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { deleteManualUpdate } from "@/lib/dal/wiki-home";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteManualUpdate(id);
  return Response.json({ ok: true });
}
