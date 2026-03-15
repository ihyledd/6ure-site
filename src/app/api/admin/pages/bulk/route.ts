import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { bulkDeletePages, bulkUpdatePages } from "@/lib/dal/pages";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { ids, action, value } = body as {
    ids?: string[];
    action?: "featured" | "hidden" | "delete" | "publish" | "unpublish";
    value?: boolean;
  };
  if (!Array.isArray(ids) || ids.length === 0 || !action) {
    return Response.json({ error: "Missing ids or action" }, { status: 400 });
  }

  switch (action) {
    case "delete":
      await bulkDeletePages(ids);
      return Response.json({ ok: true, deleted: ids.length });
    case "featured":
      await bulkUpdatePages(ids, { featured: value ?? true });
      return Response.json({ ok: true });
    case "hidden":
      await bulkUpdatePages(ids, { hidden: value ?? true });
      return Response.json({ ok: true });
    case "publish":
      await bulkUpdatePages(ids, { published: true });
      return Response.json({ ok: true });
    case "unpublish":
      await bulkUpdatePages(ids, { published: false });
      return Response.json({ ok: true });
    default:
      return Response.json({ error: "Invalid action" }, { status: 400 });
  }
}
