import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSiteSettingsByPrefix, setSiteSetting } from "@/lib/site-settings";
import { DEFAULT_POPUPS } from "@/lib/requests-popups";

/** GET popup strings (popup_* keys). Returns DB values merged over defaults. */
export async function GET() {
  try {
    const fromDb = await getSiteSettingsByPrefix("popup_");
    const merged = { ...DEFAULT_POPUPS, ...fromDb };
    return NextResponse.json(merged);
  } catch (error) {
    console.error("[API] GET /api/site-settings/popups:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/** PUT popup strings (staff only). */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, string>;
    for (const [key, value] of Object.entries(body)) {
      const k = key.startsWith("popup_") ? key : `popup_${key}`;
      if (DEFAULT_POPUPS[k] !== undefined || key.startsWith("popup_")) {
        await setSiteSetting(k, String(value));
      }
    }
    const fromDb = await getSiteSettingsByPrefix("popup_");
    const merged = { ...DEFAULT_POPUPS, ...fromDb };
    return NextResponse.json(merged);
  } catch (error) {
    console.error("[API] PUT /api/site-settings/popups:", error);
    return NextResponse.json(
      { error: "Failed to save popup settings" },
      { status: 500 }
    );
  }
}
