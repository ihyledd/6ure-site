import { getStaff } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const PRESENCE_FETCH_TIMEOUT_MS = 3000;

/** Public API: returns staff from dashboard (staff.json). Add staff via dashboard using Discord User ID. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  type StaffItem = {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    description: string;
    roles: string[];
    socials?: Record<string, string>;
    presence?: "online" | "idle" | "dnd" | "offline";
  };

  const raw = await getStaff();
  const staff: StaffItem[] = raw
    .filter((s) => s.display)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => {
      const roleStr = String(s.role ?? "").trim();
      const roles = roleStr
        ? roleStr.split(/[,;]/).map((r) => r.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean)
        : [];
      const socials: Record<string, string> = {};
      if (s.socials && typeof s.socials === "object") {
        for (const [k, v] of Object.entries(s.socials)) {
          if (typeof v === "string" && v.trim()) socials[k] = v.trim();
        }
      }
      return {
        id: s.id,
        name: s.name,
        username: s.username ?? "",
        avatar: s.avatar || undefined,
        description: s.description ?? "",
        roles,
        socials: Object.keys(socials).length ? socials : undefined,
      };
    });

  // Fetch presence from Requests bot (same bot; read-only endpoint)
  const botApiUrl = process.env.REQUESTS_BOT_API_URL || process.env.BOT_API_URL;
  if (botApiUrl && staff.length > 0) {
    const ids = staff.map((s) => s.id).join(",");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRESENCE_FETCH_TIMEOUT_MS);
      const res = await fetch(`${botApiUrl.replace(/\/$/, "")}/presence?ids=${encodeURIComponent(ids)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const presenceMap = (await res.json()) as Record<string, string>;
        for (const s of staff) {
          const status = presenceMap[s.id];
          if (status && ["online", "idle", "dnd", "offline"].includes(status)) {
            s.presence = status as "online" | "idle" | "dnd" | "offline";
          }
        }
      }
    } catch {
      // Bot unreachable or timeout – return staff without presence
    }
  }

  if (debug) {
    return Response.json({ staff, _debug: { source: "staff.json", count: staff.length } });
  }

  return new Response(JSON.stringify({ staff }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30",
    },
  });
}
