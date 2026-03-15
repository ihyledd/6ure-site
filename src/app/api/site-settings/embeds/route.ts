import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getEmbedSettings,
  updateEmbedSettings,
} from "@/lib/site-settings";

/** Staff only. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const settings = await getEmbedSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] GET /api/site-settings/embeds:", error);
    return NextResponse.json(
      { error: "Failed to fetch embed settings" },
      { status: 500 }
    );
  }
}

/** Staff only. */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, string>;
    await updateEmbedSettings(body);
    const settings = await getEmbedSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] PUT /api/site-settings/embeds:", error);
    return NextResponse.json(
      { error: "Failed to save embed settings" },
      { status: 500 }
    );
  }
}
