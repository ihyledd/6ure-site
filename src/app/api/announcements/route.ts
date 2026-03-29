import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllAnnouncements, createAnnouncement } from "@/lib/dal/announcements";

/** GET /api/announcements - List all announcements (staff only) */
export async function GET() {
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

  try {
    const list = await getAllAnnouncements();
    return NextResponse.json(list);
  } catch (error) {
    console.error("[API] GET /api/announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

/** POST /api/announcements - Create announcement (staff only) */
export async function POST(req: Request) {
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

  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    if (!title && !message) {
      return NextResponse.json(
        { error: "Title or message is required" },
        { status: 400 }
      );
    }

    const id = await createAnnouncement({
      title: title || "Announcement",
      message: message || "",
      active: body.active !== false,
      centered: body.centered === true,
      discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : body.discountPercent != null ? parseInt(String(body.discountPercent), 10) : null,
      endsAt: typeof body.endsAt === "string" && body.endsAt.trim() ? body.endsAt.trim().slice(0, 10) : null,
    });

    const list = await getAllAnnouncements();
    const created = list.find((a) => a.id === id);
    return NextResponse.json(
      created ?? { id, title: title || "Announcement", message, active: true, centered: false, discountPercent: null, endsAt: null },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/announcements:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}
