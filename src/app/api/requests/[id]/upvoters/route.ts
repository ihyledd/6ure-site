import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestById, getUpvoters } from "@/lib/requests-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 }
    );
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const req = await getRequestById(id);
  if (!req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const offset = (page - 1) * limit;

    const result = await getUpvoters(id, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] GET /api/requests/[id]/upvoters:", error);
    return NextResponse.json(
      { error: "Failed to fetch upvoters" },
      { status: 500 }
    );
  }
}
