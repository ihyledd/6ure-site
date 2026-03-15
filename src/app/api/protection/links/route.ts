import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getProtectedLinks,
  getProtectionEnabled,
  addProtectedLink,
} from "@/lib/dal/protection";

/** GET /api/protection/links - Staff only. Returns flat array { links: [{ id, groupName, link, type }], enabled } */
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
    const [links, enabled] = await Promise.all([
      getProtectedLinks(),
      getProtectionEnabled(),
    ]);
    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        groupName: l.groupName,
        link: l.link,
        type: l.type,
        ...(l.enabled !== undefined && { enabled: l.enabled }),
        ...(Object.prototype.hasOwnProperty.call(l as Record<string, unknown>, "yaml_file") && {
          // When using file-based storage, links may include yaml_file
          // so the client can show the currently assigned YAML per group.
          // In DB mode this will simply be omitted.
          yaml_file: (l as Record<string, unknown>)["yaml_file"],
        }),
        ...(Object.prototype.hasOwnProperty.call(l as Record<string, unknown>, "yaml_file_suggested") && {
          // File-based storage can also expose a suggested YAML file
          // based on group/editor name for convenience in the UI.
          yaml_file_suggested: (l as Record<string, unknown>)["yaml_file_suggested"],
        }),
      })),
      enabled,
    });
  } catch (error) {
    console.error("[API] GET /api/protection/links:", error);
    return NextResponse.json(
      { error: "Failed to fetch protection links" },
      { status: 500 }
    );
  }
}

/** POST /api/protection/links - Add protected link (staff only) */
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
    const groupName =
      body.group_name && typeof body.group_name === "string"
        ? body.group_name.trim() || "default"
        : "default";
    const type = body.type === "keyword" ? "keyword" : "link";

    const linksArray =
      Array.isArray(body.links) &&
      body.links.every((x: unknown) => typeof x === "string")
        ? body.links.map((s: string) => s.trim()).filter(Boolean)
        : null;

    const singleLink =
      body.link && typeof body.link === "string" ? body.link.trim() : "";

    const items: string[] = linksArray ?? (singleLink ? [singleLink] : []);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Link or keyword is required" },
        { status: 400 }
      );
    }

    const inserted = await Promise.all(
      items.map((link) => addProtectedLink({ groupName, link, type }))
    );

    if (inserted.length === 1) {
      return NextResponse.json(
        { id: inserted[0], groupName, link: items[0], type },
        { status: 201 }
      );
    }
    return NextResponse.json(
      { added: inserted.length, groupName, type },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/protection/links:", error);
    return NextResponse.json(
      { error: "Failed to add protected link" },
      { status: 500 }
    );
  }
}

