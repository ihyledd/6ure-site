import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProtectedUsers, getProtectedUsersForPublic, addProtectedUser } from "@/lib/dal/protection";
import { fetchDiscordUser } from "@/lib/sync-requests-user";

/** GET /api/protection/users - Public list for Protected page (full fields for cards) */
export async function GET() {
  try {
    const users = await getProtectedUsersForPublic();
    return NextResponse.json(users);
  } catch (error) {
    console.error("[API] GET /api/protection/users:", error);
    return NextResponse.json(
      { error: "Failed to fetch protected users" },
      { status: 500 }
    );
  }
}

/** POST /api/protection/users - Add protected user (staff only) */
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
    const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
    if (!userId) {
      return NextResponse.json(
        { error: "User ID (Discord ID) is required" },
        { status: 400 }
      );
    }

    const subscriptionEndsAt =
      body.subscription_ends_at && typeof body.subscription_ends_at === "string"
        ? body.subscription_ends_at.trim().slice(0, 10) || null
        : null;
    let subscriptionDateSource: "manual" | "paypal" | undefined;
    if (body.subscription_date_source === "paypal") {
      const { hasMigrationDiscount } = await import("@/lib/dal/subscriptions");
      const migrated = await hasMigrationDiscount(userId, "LEAK_PROTECTION");
      if (!migrated) {
        return NextResponse.json(
          {
            error:
              "PayPal date sync is only for users who completed Leak Protection migration (Patreon → PayPal).",
          },
          { status: 400 }
        );
      }
      subscriptionDateSource = "paypal";
    } else if (body.subscription_date_source === "manual") {
      subscriptionDateSource = "manual";
    }
    const socialLink =
      body.social_link && typeof body.social_link === "string"
        ? body.social_link.trim() || null
        : null;

    let displayName: string | null = null;
    let avatarUrl: string | null = null;
    let creatorName: string | null = null;
    let creatorAvatar: string | null = null;
    let creatorPlatform: string | null = null;
    let followerCount = 0;
    let videoCount: number | null = null;
    let likesCount: number | null = null;
    let verified: boolean | null = null;
    let creatorBio: string | null = null;
    let creatorBioLink: string | null = null;

    const discord = await fetchDiscordUser(userId);
    if (discord) {
      displayName =
        discord.global_name ||
        (discord as { display_name?: string }).display_name ||
        discord.username ||
        null;
      if (discord.avatar) {
        const ext = String(discord.avatar).startsWith("a_") ? "gif" : "png";
        avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${discord.avatar}.${ext}?size=128`;
      }
    } else {
      const { execute } = await import("@/lib/db");
      await execute(
        `INSERT INTO users (id, username, discriminator, global_name, display_name, avatar, banner, accent_color, public_flags, premium_type, roles, patreon_premium, guild_nickname, guild_avatar, boost_level, premium_since, avatar_decoration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [userId, "Protected User", null, null, null, null, null, null, 0, 0, null, false, null, null, 0, null, null]
      );
    }

    if (socialLink) {
      const { enrichCreator, isAllowedCreatorDomain } = await import("@/lib/scraper");
      if (isAllowedCreatorDomain(socialLink)) {
        try {
          const enriched = await enrichCreator(socialLink);
          creatorName = enriched.name ?? null;
          creatorAvatar = enriched.avatar ?? null;
          creatorPlatform = enriched.platform ?? null;
          followerCount = enriched.follower_count ?? 0;
          videoCount = enriched.video_count ?? null;
          likesCount = enriched.likes_count ?? null;
          verified = enriched.verified ?? null;
        } catch {
          // enrich failed
        }
      }
    }

    await addProtectedUser({
      userId,
      subscriptionEndsAt,
      subscriptionDateSource,
      socialLink,
      createdBy: session.user.id,
      displayName,
      avatarUrl,
      creatorName,
      creatorAvatar,
      creatorPlatform,
      followerCount,
      videoCount,
      likesCount,
      verified,
      creatorBio,
      creatorBioLink,
    });

    // Auto-hide any matching resources_items rows.
    try {
      const { applyProtectionForUser } = await import("@/lib/protection-reconcile");
      const affected = await applyProtectionForUser(userId);
      if (affected > 0) {
        console.log(`[protection/users POST] Auto-hid ${affected} resource(s) for ${userId}`);
      }
    } catch (e) {
      console.warn("[protection/users POST] applyProtectionForUser failed:", (e as Error).message);
    }

    const list = await getProtectedUsers();
    const added = list.find((u) => u.userId === userId);
    return NextResponse.json(
      added ?? {
        userId,
        subscriptionEndsAt,
        socialLink,
        displayName,
        creatorName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/protection/users:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to add protected user";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
