import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllAnnouncements, updateAnnouncement, deleteAnnouncement } from "@/lib/dal/announcements";

/** PUT /api/announcements/[id] - Update announcement (staff only) */
export async function PUT(
  req: Request,
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
  const announcementId = parseInt(id, 10);
  if (isNaN(announcementId) || announcementId < 1) {
    return NextResponse.json(
      { error: "Invalid announcement ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const updates: Parameters<typeof updateAnnouncement>[1] = {};
    if (body.title !== undefined) updates.title = typeof body.title === "string" ? body.title.trim() : "";
    if (body.message !== undefined) updates.message = typeof body.message === "string" ? body.message : "";
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (body.centered !== undefined) updates.centered = Boolean(body.centered);
    if (body.discountPercent !== undefined) updates.discountPercent = typeof body.discountPercent === "number" ? body.discountPercent : body.discountPercent === null || body.discountPercent === "" ? null : parseInt(String(body.discountPercent), 10) || null;
    if (body.endsAt !== undefined) updates.endsAt = typeof body.endsAt === "string" && body.endsAt.trim() ? body.endsAt.trim().slice(0, 10) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Provide at least one field to update" },
        { status: 400 }
      );
    }

    const ok = await updateAnnouncement(announcementId, updates);
    if (!ok) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    const list = await getAllAnnouncements();
    const updated = list.find((a) => a.id === announcementId);
    return NextResponse.json(updated ?? { id: announcementId, ...updates });
  } catch (error) {
    console.error("[API] PUT /api/announcements/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    );
  }
}

/** DELETE /api/announcements/[id] - Delete announcement (staff only) */
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
  const announcementId = parseInt(id, 10);
  if (isNaN(announcementId) || announcementId < 1) {
    return NextResponse.json(
      { error: "Invalid announcement ID" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteAnnouncement(announcementId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] DELETE /api/announcements/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
