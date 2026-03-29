import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProtectionEnabled, setProtectionEnabled } from "@/lib/dal/protection";

/** PATCH /api/protection/links/enabled - Toggle master switch (staff only) */
export async function PATCH(req: Request) {
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
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Body must include enabled: true or false" },
        { status: 400 }
      );
    }
    await setProtectionEnabled(body.enabled);
    const enabled = await getProtectionEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("[API] PATCH /api/protection/links/enabled:", error);
    return NextResponse.json(
      { error: "Failed to update enabled state" },
      { status: 500 }
    );
  }
}
