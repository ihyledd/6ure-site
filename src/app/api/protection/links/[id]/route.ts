import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteProtectedLink } from "@/lib/dal/protection";

/** DELETE /api/protection/links/[id] - Remove protected link (staff only) */
export async function DELETE(
  _req: Request,
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

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "Invalid link ID" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteProtectedLink(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Protected link not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] DELETE /api/protection/links/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete protected link" },
      { status: 500 }
    );
  }
}
