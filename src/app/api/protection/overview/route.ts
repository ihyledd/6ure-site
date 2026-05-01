import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { getProtectedUsersForPublic } from "@/lib/dal/protection";

/**
 * GET /api/protection/overview — combined read-only view for leaker dashboards.
 *
 * Returns:
 *   - creators: protected_users rows enriched with their derived URLs (from
 *     resources_items.place_url) and resource names (from resources_items.name)
 *   - links: protection_groups URL/keyword entries (from leak_protection_data.json)
 *   - resourceCount, linkCount, userCount totals
 *
 * Allowed for ADMIN and LEAKER. Mutations are NOT exposed here.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "LEAKER") {
    return NextResponse.json({ error: "Staff or leaker access required" }, { status: 403 });
  }

  // 1) Protected creators
  let creators: Array<Record<string, unknown>> = [];
  try {
    creators = await getProtectedUsersForPublic();
  } catch (e) {
    console.warn("[protection/overview] users fetch failed:", (e as Error).message);
  }

  // 2) Protected links (file-based)
  let links: Array<Record<string, unknown>> = [];
  let linksEnabled = true;
  try {
    const { getProtectedLinksFromFile, getProtectionEnabledFromFile, isProtectionFileConfigured } = await import("@/lib/protection-links-file");
    if (isProtectionFileConfigured()) {
      links = await getProtectedLinksFromFile();
      linksEnabled = await getProtectionEnabledFromFile();
    } else {
      const rows = await query<{ id: number; group_name: string; link: string; type: string }>(
        "SELECT id, group_name AS groupName, link, type FROM protected_links ORDER BY group_name ASC"
      );
      links = rows.map(r => ({ ...r, enabled: true }));
    }
  } catch (e) {
    console.warn("[protection/overview] links fetch failed:", (e as Error).message);
  }

  // 3) Build per-creator URLs/Resources lookup using is_protected = 1 rows.
  // We match on editor_name (case-insensitive) against creatorName / displayName.
  const protectedRes = await query<{
    name: string;
    place_url: string | null;
    editor_name: string;
  }>(
    `SELECT name, place_url, editor_name
       FROM resources_items
      WHERE is_protected = 1
      ORDER BY editor_name ASC, name ASC`
  );

  const byEditor: Map<string, { urls: string[]; names: string[] }> = new Map();
  for (const r of protectedRes) {
    const key = (r.editor_name || "").toLowerCase();
    if (!key) continue;
    const entry = byEditor.get(key) || { urls: [], names: [] };
    if (r.place_url) entry.urls.push(r.place_url);
    if (r.name) entry.names.push(r.name);
    byEditor.set(key, entry);
  }

  // Attach urls + resourceNames to each creator. Some creators may not have any
  // matching DB rows yet (e.g. only their YAML was imported into protected/).
  const enrichedCreators = creators.map((c) => {
    const candidates = [
      typeof c.creatorName === "string" ? c.creatorName : "",
      typeof c.displayName === "string" ? c.displayName : "",
      typeof c.username === "string" ? c.username : "",
    ].filter(Boolean) as string[];
    let urls: string[] = [];
    let names: string[] = [];
    for (const candidate of candidates) {
      const entry = byEditor.get(candidate.toLowerCase());
      if (entry) {
        urls = urls.concat(entry.urls);
        names = names.concat(entry.names);
      }
    }
    return { ...c, urls: Array.from(new Set(urls)), resourceNames: Array.from(new Set(names)) };
  });

  return NextResponse.json({
    creators: enrichedCreators,
    links,
    linksEnabled,
    counts: {
      creators: enrichedCreators.length,
      protectedResources: protectedRes.length,
      links: links.length,
    },
  });
}
