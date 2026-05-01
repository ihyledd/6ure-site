import { NextResponse } from "next/server";
import { getActiveAnnouncements } from "@/lib/dal/announcements";

export async function GET() {
  try {
    const list = await getActiveAnnouncements();
    return NextResponse.json(list);
  } catch (error) {
    console.error("[API] GET /api/announcements/active:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}
