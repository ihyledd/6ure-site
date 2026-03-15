import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableYamlFiles } from "@/lib/dal/protection";

/** GET /api/protection/links/yaml-files - List available YAML files for dropdown */
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
    const files = await getAvailableYamlFiles();
    return NextResponse.json({ files });
  } catch (error) {
    console.error("[API] GET /api/protection/links/yaml-files:", error);
    return NextResponse.json(
      { error: "Failed to fetch yaml files" },
      { status: 500 }
    );
  }
}
