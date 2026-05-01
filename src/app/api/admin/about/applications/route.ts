import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getApplications, updateApplicationStatus } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const applications = await getApplications();
  return Response.json({ applications });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;
  const id = String(body.id ?? "");

  if (action === "accept" && id) {
    await updateApplicationStatus(id, "accepted");
    return Response.json({ ok: true });
  }
  if (action === "reject" && id) {
    await updateApplicationStatus(id, "rejected");
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
