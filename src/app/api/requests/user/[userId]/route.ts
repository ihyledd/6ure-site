import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestsByUserId } from "@/lib/requests-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const userId = (await params).userId;
  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const status = searchParams.get("status")?.trim() || undefined;
    const sort = searchParams.get("sort") ?? "recent";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const result = await getRequestsByUserId(session.user.id, {
      page,
      limit,
      status: status || undefined,
      sort,
      order,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GET /api/requests/user/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to fetch user requests" },
      { status: 500 }
    );
  }
}
