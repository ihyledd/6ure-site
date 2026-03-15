/**
 * Discord staff - fetched by listing guild members and filtering by role.
 * Matches logic from about.6ureleaks.com/sync-staff.php
 */

export const STAFF_ROLE_IDS = {
  founder: "1182176178300256368",
  developer: "1352515058738925669",
  manager: "1118869533470511158",
  exec_mod: "1421110090097889320",
  moderator: "1264557816610422846",
} as const;

export type RoleKey = keyof typeof STAFF_ROLE_IDS;

export type DiscordStaffMember = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  roles: RoleKey[];
};

const ROLE_ORDER: RoleKey[] = ["founder", "developer", "manager", "exec_mod", "moderator"];
const ROLE_ID_TO_KEY = new Map<string, RoleKey>(
  (Object.entries(STAFF_ROLE_IDS) as [RoleKey, string][]).map(([k, v]) => [v, k])
);

const DISCORD_FETCH_TIMEOUT_MS = 10_000;

async function discordApi(
  endpoint: string,
  token: string
): Promise<{ data: unknown; ok: boolean; status: number; retryAfter?: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);

  const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "6ureAboutSync/1.0",
    },
    signal: controller.signal,
  });
  clearTimeout(timeout);

  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const retryAfter = (data as { retry_after?: number }).retry_after ?? 2;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return discordApi(endpoint, token);
  }
  return { data: Array.isArray(data) ? data : [], ok: res.ok, status: res.status };
}

type DiscordMember = {
  user?: { id: string; username?: string; global_name?: string; avatar?: string };
  nick?: string;
  avatar?: string;
  roles: string[];
};

/** Fetch first page only (max 1000 members) to keep response time under proxy limits. */
async function fetchMembersFirstPage(
  guildId: string,
  token: string
): Promise<DiscordMember[]> {
  const { data } = await discordApi(
    `/guilds/${guildId}/members?limit=1000`,
    token
  );
  return Array.isArray(data) ? (data as DiscordMember[]) : [];
}

function avatarUrl(
  userId: string,
  guildId: string,
  memberAvatar?: string,
  userAvatar?: string
): string | undefined {
  const hash = memberAvatar ?? userAvatar;
  if (!hash) return undefined;
  const ext = String(hash).startsWith("a_") ? "gif" : "webp";
  if (memberAvatar) {
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${memberAvatar}.${ext}?size=256`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=256`;
}

export type DiscordUserInfo = {
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
};

/** Fetch a Discord user by ID (bot token required). */
export async function fetchDiscordUser(userId: string): Promise<DiscordUserInfo | null> {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  if (!BOT_TOKEN || !userId.trim()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${encodeURIComponent(userId.trim())}`, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "User-Agent": "6ureAboutSync/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data.id !== "string") return null;
    return {
      id: data.id,
      username: data.username ?? "unknown",
      global_name: data.global_name,
      avatar: data.avatar,
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export function discordAvatarUrl(userId: string, avatarHash?: string): string {
  if (!avatarHash) return "";
  const ext = String(avatarHash).startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
}

export async function fetchDiscordStaff(): Promise<DiscordStaffMember[]> {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  if (!BOT_TOKEN || !GUILD_ID) return [];

  const staffRoleIds = new Set<string>(Object.values(STAFF_ROLE_IDS));
  const members = await fetchMembersFirstPage(GUILD_ID, BOT_TOKEN);

  const result: DiscordStaffMember[] = [];

  for (const m of members) {
    const user = m.user;
    if (!user) continue;
    const memberRoles = m.roles ?? [];
    const roleKeys = memberRoles
      .filter((rid) => staffRoleIds.has(rid))
      .map((rid) => ROLE_ID_TO_KEY.get(rid))
      .filter((k): k is RoleKey => k != null);

    if (roleKeys.length === 0) continue;

    const roles: RoleKey[] = [...new Set(roleKeys)].sort(
      (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
    );

    if (roles.includes("founder") && !roles.includes("developer")) {
      roles.push("developer");
    }

    const name = m.nick ?? user.global_name ?? user.username ?? "Unknown";
    const username = user.username ?? "unknown";
    const avatar = avatarUrl(user.id, GUILD_ID, m.avatar, user.avatar);

    result.push({
      id: user.id,
      name,
      username,
      avatar,
      roles,
    });
  }

  result.sort((a, b) => {
    const aBest = Math.min(...a.roles.map((r) => ROLE_ORDER.indexOf(r)));
    const bBest = Math.min(...b.roles.map((r) => ROLE_ORDER.indexOf(r)));
    return aBest - bBest;
  });

  return result;
}
