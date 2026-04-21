import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { MysqlAdapter } from "@/lib/auth-mysql-adapter";
import { queryOne, query } from "@/lib/db";
import {
  syncRequestsUser,
  fetchGuildMemberForSync,
  fetchDiscordUser,
} from "@/lib/sync-requests-user";
import type { DiscordProfile } from "@/lib/sync-requests-user";

// Optional dev override. If unset, nobody is force-marked as staff.
const WIKI_DEVELOPER_DISCORD_ID = process.env.WIKI_DEVELOPER_DISCORD_ID || "";

// Staff badge: driven by the developer role id (optionally plus any extra staff role ids).
const STAFF_ROLE_IDS = (
  [
    process.env.DISCORD_DEVELOPER_ROLE_ID || "",
    process.env.DISCORD_STAFF_ROLE_IDS || "",
  ]
    .join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isStaffFromRoles(rolesJson: string | null | undefined): boolean {
  if (!rolesJson || STAFF_ROLE_IDS.length === 0) return false;
  try {
    const roles = typeof rolesJson === "string" ? JSON.parse(rolesJson || "[]") : rolesJson;
    if (!Array.isArray(roles)) return false;
    return STAFF_ROLE_IDS.some((id) => roles.includes(id));
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MysqlAdapter(),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: "identify guilds" },
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 0, // Always refresh from DB so role changes take effect immediately
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        path: "/",
        domain:
          process.env.NODE_ENV === "production" &&
          process.env.NEXTAUTH_URL?.includes("6ureleaks.com")
            ? ".6ureleaks.com"
            : undefined,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60,
      },
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return true;
      const discordId = account.providerAccountId;
      if (!discordId) return true;
      try {
        const fullProfile = await fetchDiscordUser(discordId);
        const p = fullProfile ?? {
          id: discordId,
          username: (profile as { name?: string })?.name ?? "User",
          avatar: (profile as { image?: string })?.image ?? null,
        } as DiscordProfile;
        const guildMember = await fetchGuildMemberForSync(discordId);
        await syncRequestsUser(p, guildMember);
      } catch (e) {
        console.warn("[Auth] syncRequestsUser failed:", e);
      }
      return true;
    },
    async session({ session, user }) {
      if (!session.user) return session;
      const account = await queryOne<{ providerAccountId: string }>(
        "SELECT providerAccountId FROM Account WHERE userId = ? AND provider = ?",
        [user.id, "discord"]
      );
      const discordId = account?.providerAccountId ?? user.id;
      type RequestsUserRow = {
        roles: string | null;
        patreon_premium: boolean;
        leak_protection?: boolean | number;
        guild_nickname: string | null;
        guild_avatar: string | null;
        username: string;
        global_name: string | null;
        display_name: string | null;
        boost_level: number;
        avatar_decoration: string | null;
      };
      let requestsUser: RequestsUserRow | null = null;
      try {
        requestsUser = (await queryOne<RequestsUserRow>(
          "SELECT roles, patreon_premium, COALESCE(leak_protection, 0) as leak_protection, guild_nickname, guild_avatar, username, global_name, display_name, COALESCE(boost_level, 0) as boost_level, avatar_decoration FROM users WHERE id = ?",
          [discordId]
        )) ?? null;
      } catch {
        requestsUser = (await queryOne<RequestsUserRow>(
          "SELECT roles, patreon_premium, guild_nickname, guild_avatar, username, global_name, display_name, COALESCE(boost_level, 0) as boost_level, avatar_decoration FROM users WHERE id = ?",
          [discordId]
        )) ?? null;
      }

      // Check for active PayPal subscriptions (dual system: Patreon OR PayPal)
      let hasPaypalPremium = false;
      let hasPaypalLP = false;
      try {
        const paypalSubs = await query<{ plan_category: string }>(
          "SELECT plan_category FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE'",
          [discordId]
        );
        for (const sub of paypalSubs) {
          if (sub.plan_category === "PREMIUM") hasPaypalPremium = true;
          if (sub.plan_category === "LEAK_PROTECTION") hasPaypalLP = true;
        }
      } catch {
        // subscriptions table might not exist yet, ignore
      }

      const isStaff =
        (requestsUser && isStaffFromRoles(requestsUser.roles)) ||
        (WIKI_DEVELOPER_DISCORD_ID && discordId === WIKI_DEVELOPER_DISCORD_ID);
      
      return {
        ...session,
        user: {
          ...session.user,
          id: discordId,
          name:
            requestsUser?.guild_nickname ??
            requestsUser?.global_name ??
            requestsUser?.display_name ??
            session.user.name,
          image: requestsUser?.guild_avatar ?? session.user.image,
          role: isStaff ? ("ADMIN" as const) : ("USER" as const),
          username: requestsUser?.username ?? null,
          patreon_premium: (requestsUser?.patreon_premium ?? false) || hasPaypalPremium,
          leak_protection: Boolean(requestsUser?.leak_protection ?? false) || hasPaypalLP,
          boost_level: requestsUser?.boost_level ?? 0,
          avatar_decoration: requestsUser?.avatar_decoration ?? null,
        },
      };
    },
  },
  pages: {
    signIn: "/",
    signOut: "/auth/signout",
  },
  events: {
    async createUser() {
      // User created by adapter; RequestsUser is synced in signIn
    },
  },
};
