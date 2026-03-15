import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { completeDataExportRequest } from "@/lib/dal/data-export";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { downloadUrl?: string };
  const downloadUrl = typeof body.downloadUrl === "string" ? body.downloadUrl.trim() || undefined : undefined;
  await completeDataExportRequest(id, downloadUrl ?? null);
  return Response.json({ ok: true });
}
