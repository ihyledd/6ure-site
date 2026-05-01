import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getProtectedLinks,
  getProtectionEnabled,
  addProtectedLink,
} from "@/lib/dal/protection";

/**
 * GET /api/protection/links — returns all protected links/keywords.
 * Accessible to ADMIN and LEAKER roles (LEAKER gets a read-only view in their dashboard).
 * Returns { links: [...], enabled } shape.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  const role = session.user.role;
  if (role !== "ADMIN" && (role as string) !== "LEAKER") {
    return NextResponse.json(
      { error: "Staff or leaker access required" },
      { status: 403 }
    );
  }

  // Fetch links & enabled flag independently so a failure in one does not break the whole response.
  let links: Awaited<ReturnType<typeof getProtectedLinks>> = [];
  let enabled = true;
  let warning: string | null = null;

  try {
    links = await getProtectedLinks();
  } catch (error) {
    console.error("[API] GET /api/protection/links: getProtectedLinks failed:", error);
    warning = error instanceof Error ? error.message : "Failed to load protected links";
  }

  try {
    enabled = await getProtectionEnabled();
  } catch (error) {
    console.error("[API] GET /api/protection/links: getProtectionEnabled failed:", error);
  }

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      groupName: l.groupName,
      link: l.link,
      type: l.type,
      ...(l.enabled !== undefined && { enabled: l.enabled }),
      ...(Object.prototype.hasOwnProperty.call(l as Record<string, unknown>, "yaml_file") && {
        yaml_file: (l as Record<string, unknown>)["yaml_file"],
      }),
      ...(Object.prototype.hasOwnProperty.call(l as Record<string, unknown>, "yaml_file_suggested") && {
        yaml_file_suggested: (l as Record<string, unknown>)["yaml_file_suggested"],
      }),
    })),
    enabled,
    ...(warning ? { warning } : {}),
  });
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

