import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDataExportRequest } from "@/lib/dal/data-export";

/**
 * POST /api/account/export
 * Creates a data export request (developer-confirmed workflow).
 * User is notified when the export is ready.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await createDataExportRequest(
      session.user.id,
      session.user.name ?? null
    );

    return NextResponse.json({ success: true, message: "Export request submitted. You will be notified when your data is ready." });
  } catch (e) {
    console.error("[account/export]", e);
    return NextResponse.json({ error: "Failed to submit export request" }, { status: 500 });
  }
}
