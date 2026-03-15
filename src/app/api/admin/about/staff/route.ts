import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getStaff, saveStaff, type StaffSocials } from "@/lib/admin-data";
import { fetchDiscordUser, discordAvatarUrl } from "@/lib/discord-staff";

export const dynamic = "force-dynamic";

const SOCIAL_KEYS = ["tiktok", "instagram", "youtube", "twitter", "twitch", "github"] as const;

function normalizeSocials(raw: unknown): StaffSocials {
  if (raw == null || typeof raw !== "object") return {};
  const out: StaffSocials = {};
  for (const key of SOCIAL_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string") {
      const url = v.trim();
      if (url) out[key] = url;
    }
  }
  return out;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const staff = await getStaff();
  return Response.json({ staff });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;
  const staff = await getStaff();

  if (action === "add") {
    const role = String(body.role ?? "").trim();
    if (!role) return Response.json({ error: "Role is required" }, { status: 400 });

    const userId = String(body.userId ?? body.id ?? "").trim();
    let id: string;
    let name: string;
    let avatar: string;

    if (!userId) {
      return Response.json({ error: "Discord User ID is required" }, { status: 400 });
    }
    const user = await fetchDiscordUser(userId);
    if (!user) return Response.json({ error: "Could not fetch Discord user. Check the user ID." }, { status: 400 });
    id = user.id;
    name = user.global_name ?? user.username ?? "Unknown";
    avatar = discordAvatarUrl(user.id, user.avatar);
    const username = user.username ?? "";
    const description = String(body.description ?? "").trim();
    const socials = normalizeSocials(body.socials);

    if (!name) return Response.json({ error: "Could not get display name from Discord" }, { status: 400 });

    staff.push({
      id,
      name,
      username: username || undefined,
      role,
      avatar,
      description: description || undefined,
      display: body.display !== false,
      order: typeof body.order === "number" ? body.order : 0,
      socials: Object.keys(socials).length ? socials : undefined,
    });
    await saveStaff(staff);
    return Response.json({ ok: true });
  }

  if (action === "edit") {
    const id = String(body.id ?? "");
    for (const s of staff) {
      if (s.id === id) {
        if (body.name != null) s.name = String(body.name).trim();
        if (body.username != null) s.username = String(body.username).trim() || undefined;
        if (body.role != null) s.role = String(body.role).trim();
        if (body.avatar != null) s.avatar = String(body.avatar).trim();
        if (body.description != null) s.description = String(body.description).trim() || undefined;
        if (body.display != null) s.display = !!body.display;
        if (body.order != null) s.order = typeof body.order === "number" ? body.order : 0;
        if (body.socials !== undefined) s.socials = Object.keys(normalizeSocials(body.socials)).length ? normalizeSocials(body.socials) : undefined;
        break;
      }
    }
    await saveStaff(staff);
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    const id = String(body.id ?? "");
    const filtered = staff.filter((s) => s.id !== id);
    await saveStaff(filtered);
    return Response.json({ ok: true });
  }

  if (action === "reorder") {
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(String) : [];
    if (orderedIds.length === 0) return Response.json({ error: "orderedIds required" }, { status: 400 });
    const byId = new Map(staff.map((s) => [s.id, s]));
    let idx = 0;
    for (const id of orderedIds) {
      const s = byId.get(id);
      if (s) s.order = idx++;
    }
    for (const s of staff) {
      if (!orderedIds.includes(s.id)) s.order = idx++;
    }
    staff.sort((a, b) => a.order - b.order);
    await saveStaff(staff);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
