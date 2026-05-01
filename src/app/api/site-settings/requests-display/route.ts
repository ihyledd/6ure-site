import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getRequestsDisplaySettings,
  updateRequestsDisplaySettings,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** GET requests display settings (public – used by requests page). */
export async function GET() {
  try {
    const settings = await getRequestsDisplaySettings();
    return NextResponse.json(settings, { headers: NO_STORE });
  } catch (error) {
    console.error("[API] GET /api/site-settings/requests-display:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests display settings" },
      { status: 500 }
    );
  }
}

/** PUT requests display settings (staff only). */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, string>;
    await updateRequestsDisplaySettings(body);
    const settings = await getRequestsDisplaySettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API] PUT /api/site-settings/requests-display:", error);
    return NextResponse.json(
      { error: "Failed to save requests display settings" },
      { status: 500 }
    );
  }
}
