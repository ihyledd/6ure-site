import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

type ProtectedResourceRow = {
  id: number;
  name: string | null;
  editor_name: string | null;
  place_url: string | null;
  thumbnail_url: string | null;
  status: string | null;
  hidden: number | null;
  is_protected: number | null;
  leaked_at: string | null;
  download_count: number | null;
};

const SORT_COLUMNS: Record<string, string> = {
  recent: "r.leaked_at",
  name: "r.name",
  editor: "r.editor_name",
  downloads: "r.download_count",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? "recent";
  const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;

  const conditions = ["r.is_protected = 1"];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(r.name LIKE ? OR r.editor_name LIKE ? OR r.place_url LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortColumn = SORT_COLUMNS[sort] ?? SORT_COLUMNS.recent;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM resources_items r ${whereClause}`,
    params
  );
  const total = Number(countRow?.total ?? 0);

  const items = await query<ProtectedResourceRow>(
    `SELECT r.id, r.name, r.editor_name, r.place_url, r.thumbnail_url,
            r.status, r.hidden, r.is_protected, r.leaked_at, r.download_count
       FROM resources_items r
       ${whereClause}
       ORDER BY ${sortColumn} ${order}, r.id DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [stats] = await query<{
    protected_count: number;
    protected_hidden_count: number;
    visible_protected_count: number;
  }>(
    `SELECT
       SUM(CASE WHEN is_protected = 1 THEN 1 ELSE 0 END) AS protected_count,
       SUM(CASE WHEN is_protected = 1 AND (hidden = 1 OR status = 'Hidden') THEN 1 ELSE 0 END) AS protected_hidden_count,
       SUM(CASE WHEN is_protected = 1 AND (hidden = 0 OR hidden IS NULL) AND (status IS NULL OR status <> 'Hidden') THEN 1 ELSE 0 END) AS visible_protected_count
     FROM resources_items`
  );

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    stats: {
      protectedCount: Number(stats?.protected_count ?? 0),
      protectedHiddenCount: Number(stats?.protected_hidden_count ?? 0),
      visibleProtectedCount: Number(stats?.visible_protected_count ?? 0),
    },
  });
}
