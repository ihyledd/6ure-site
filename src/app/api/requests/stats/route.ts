import { NextResponse } from "next/server";
import { getRequestStats } from "@/lib/requests-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getRequestStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch (error) {
    console.error("[API] GET /api/requests/stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
