import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setProtectionGroupYaml } from "@/lib/dal/protection";

/** PATCH /api/protection/links/group-yaml - Set YAML file for a group */
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
    const groupName = body.group_name && typeof body.group_name === "string" ? body.group_name.trim() : "";
    const yamlFile = body.yaml_file && typeof body.yaml_file === "string" ? body.yaml_file.trim() : null;

    if (!groupName) {
      return NextResponse.json(
        { error: "group_name is required" },
        { status: 400 }
      );
    }

    const ok = await setProtectionGroupYaml(groupName, yamlFile);
    if (!ok) {
      return NextResponse.json(
        { error: "Group not found or per-group yaml not supported" },
        { status: 404 }
      );
    }
    return NextResponse.json({ group_name: groupName, yaml_file: yamlFile });
  } catch (error) {
    console.error("[API] PATCH /api/protection/links/group-yaml:", error);
    return NextResponse.json(
      { error: "Failed to update group yaml" },
      { status: 500 }
    );
  }
}
