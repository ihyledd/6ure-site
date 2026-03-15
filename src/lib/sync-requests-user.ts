import { execute } from "@/lib/db";

const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const GUILD_ID = process.env.DISCORD_SERVER_ID || process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const PREMIUM_ROLE_ID = process.env.DISCORD_PREMIUM_ROLE_ID || "1463910149432410152";

export type DiscordProfile = {
  id: string;
  username: string;
  discriminator?: string;
  global_name?: string | null;
  avatar?: string | null;
  banner?: string | null;
  accent_color?: number | null;
  public_flags?: number;
  avatar_decoration_data?: { asset?: string } | null;
  [key: string]: unknown;
};

function avatarUrl(discordId: string, avatar: string | null | undefined, discriminator?: string): string {
  if (avatar) {
    const ext = String(avatar).startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=64`;
  }
  const idx = discriminator ? Number(discordId) % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function cleanUsername(profile: DiscordProfile): string {
  const base = profile.username;
  if (!base) return "User";
  if (profile.discriminator && profile.discriminator !== "0") {
    return `${base}#${profile.discriminator}`;
  }
  return base;
}

/** Fetch guild member with bot token to get roles, nickname, avatar, avatar_decoration. */
async function fetchGuildMember(discordId: string): Promise<{
  roles: string[];
  nick: string | null;
  avatar: string | null;
  premium_since: string | null;
  avatar_decoration: string | null;
} | null> {
  if (!BOT_TOKEN || !GUILD_ID) return null;
  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Discord-API-Version": "10",
        },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      roles?: string[];
      nick?: string | null;
      avatar?: string | null;
      premium_since?: string | null;
      avatar_decoration_data?: { asset?: string } | null;
      user?: { avatar_decoration_data?: { asset?: string } | null } | null;
    };
    const decorationAsset =
      data.avatar_decoration_data?.asset ??
      data.user?.avatar_decoration_data?.asset ??
      null;
    return {
      roles: Array.isArray(data.roles) ? data.roles : [],
      nick: data.nick ?? null,
      avatar: data.avatar ?? null,
      premium_since: data.premium_since ?? null,
      avatar_decoration: decorationAsset ? String(decorationAsset) : null,
    };
  } catch {
    return null;
  }
}

function boostLevel(premiumSince: string | null): number {
  if (!premiumSince) return 0;
  const since = new Date(premiumSince).getTime();
  const months = Math.floor((Date.now() - since) / (1000 * 60 * 60 * 24 * 30));
  if (months >= 3) return 2;
  if (months >= 2) return 1;
  return 0;
}

/** Upsert RequestsUser from Discord profile and optional guild member. Called after Discord OAuth. */
export async function syncRequestsUser(
  profile: DiscordProfile,
  guildMember: Awaited<ReturnType<typeof fetchGuildMember>>
): Promise<{ isStaff: boolean }> {
  const discordId = profile.id;
  const roles = guildMember?.roles ?? [];
  const hasPremiumRole = roles.includes(PREMIUM_ROLE_ID);
  const isStaff =
    STAFF_ROLE_IDS.length > 0 && STAFF_ROLE_IDS.some((id) => roles.includes(id));

  const username = cleanUsername(profile);
  const avatar = avatarUrl(discordId, profile.avatar ?? null, profile.discriminator);
  const bannerUrl =
    profile.banner ?
      `https://cdn.discordapp.com/banners/${discordId}/${profile.banner}.png?size=512`
    : null;

  let guildNickname: string | null = null;
  let guildAvatar: string | null = null;
  let premiumSince: Date | null = null;
  let boostLvl = 0;
  const avatarDecoration =
    guildMember?.avatar_decoration ??
    profile.avatar_decoration_data?.asset ??
    null;

  if (guildMember && GUILD_ID) {
    guildNickname = guildMember.nick;
    if (guildMember.avatar) {
      const ext = String(guildMember.avatar).startsWith("a_") ? "gif" : "png";
      guildAvatar = `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${discordId}/avatars/${guildMember.avatar}.${ext}?size=64`;
    }
    if (guildMember.premium_since) {
      premiumSince = new Date(guildMember.premium_since);
      boostLvl = boostLevel(guildMember.premium_since);
    }
  }

  const rolesJson = roles.length ? JSON.stringify(roles) : null;
  await execute(
    `INSERT INTO users (id, username, discriminator, global_name, display_name, avatar, banner, accent_color, public_flags, premium_type, roles, patreon_premium, guild_nickname, guild_avatar, boost_level, premium_since, avatar_decoration, created_at, updated_at, last_login_at, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       discriminator = VALUES(discriminator),
       global_name = VALUES(global_name),
       display_name = VALUES(display_name),
       avatar = VALUES(avatar),
       banner = VALUES(banner),
       accent_color = VALUES(accent_color),
       public_flags = VALUES(public_flags),
       premium_type = VALUES(premium_type),
       roles = VALUES(roles),
       patreon_premium = VALUES(patreon_premium),
       guild_nickname = VALUES(guild_nickname),
       guild_avatar = VALUES(guild_avatar),
       boost_level = VALUES(boost_level),
       premium_since = VALUES(premium_since),
       avatar_decoration = VALUES(avatar_decoration),
       last_login_at = NOW(),
       last_activity_at = NOW(),
       updated_at = NOW()`,
    [
      discordId,
      username,
      profile.discriminator ?? null,
      profile.global_name ?? null,
      (profile as { display_name?: string }).display_name ?? null,
      avatar,
      bannerUrl,
      profile.accent_color ?? null,
      profile.public_flags ?? 0,
      (profile as { premium_type?: number }).premium_type ?? 0,
      rolesJson,
      hasPremiumRole,
      guildNickname,
      guildAvatar,
      boostLvl,
      premiumSince,
      avatarDecoration,
    ]
  );

  return { isStaff };
}

/** Get guild member for a Discord user (by id). Used in signIn to sync RequestsUser. */
export async function fetchGuildMemberForSync(discordId: string) {
  return fetchGuildMember(discordId);
}

/** Fetch full Discord user by id using bot token (for signIn when NextAuth only gives minimal profile). */
export async function fetchDiscordUser(discordId: string): Promise<DiscordProfile | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://discord.com/api/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Discord-API-Version": "10",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const avatarDecorationData = data.avatar_decoration_data as
      | { asset?: string }
      | null
      | undefined;
    return {
      id: String(data.id),
      username: String(data.username ?? ""),
      discriminator: data.discriminator != null ? String(data.discriminator) : undefined,
      global_name: data.global_name != null ? String(data.global_name) : null,
      avatar: data.avatar != null ? String(data.avatar) : null,
      banner: data.banner != null ? String(data.banner) : null,
      accent_color: data.accent_color != null ? Number(data.accent_color) : null,
      public_flags: data.public_flags != null ? Number(data.public_flags) : 0,
      avatar_decoration_data: avatarDecorationData ?? null,
      ...data,
    };
  } catch {
    return null;
  }
}
