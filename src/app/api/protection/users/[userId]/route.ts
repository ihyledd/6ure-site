import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateProtectedUser, deleteProtectedUser } from "@/lib/dal/protection";
import { enrichCreator, isAllowedCreatorDomain } from "@/lib/scraper";

/** PATCH /api/protection/users/[userId] - Update protected user (staff only) */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const { userId } = await params;
  const uid = userId.trim();
  if (!uid) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: Parameters<typeof updateProtectedUser>[1] = {};

    if (body.subscription_date_source !== undefined) {
      if (body.subscription_date_source === "paypal") {
        const { hasMigrationDiscount } = await import("@/lib/dal/subscriptions");
        const migrated = await hasMigrationDiscount(uid, "LEAK_PROTECTION");
        if (!migrated) {
          return NextResponse.json(
            {
              error:
                "PayPal date sync is only for users who completed Leak Protection migration (Patreon → PayPal).",
            },
            { status: 400 }
          );
        }
        updates.subscriptionDateSource = "paypal";
      } else if (body.subscription_date_source === "manual") {
        updates.subscriptionDateSource = "manual";
      }
    }

    if (body.subscription_ends_at !== undefined) {
      updates.subscriptionEndsAt =
        body.subscription_ends_at && typeof body.subscription_ends_at === "string"
          ? body.subscription_ends_at.trim().slice(0, 10) || null
          : null;
    }

    if (body.social_link !== undefined) {
      const link =
        body.social_link && typeof body.social_link === "string"
          ? body.social_link.trim() || null
          : null;
      updates.socialLink = link;

      if (!link) {
        updates.creatorName = null;
        updates.creatorAvatar = null;
        updates.creatorPlatform = null;
        updates.followerCount = 0;
        updates.videoCount = null;
        updates.likesCount = null;
        updates.verified = null;
      } else {
        if (!isAllowedCreatorDomain(link)) {
          return NextResponse.json(
            { error: "Social link must be TikTok or YouTube only" },
            { status: 400 }
          );
        }
        try {
          const enriched = await enrichCreator(link);
          updates.creatorName = enriched.name ?? null;
          updates.creatorAvatar = enriched.avatar ?? null;
          updates.creatorPlatform = enriched.platform ?? null;
          updates.followerCount = enriched.follower_count ?? 0;
          updates.videoCount = enriched.video_count ?? null;
          updates.likesCount = enriched.likes_count ?? null;
          updates.verified = enriched.verified ?? null;
        } catch {
          // enrich failed
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Provide subscription_ends_at, subscription_date_source, and/or social_link to update" },
        { status: 400 }
      );
    }

    const ok = await updateProtectedUser(uid, updates);
    if (!ok) {
      return NextResponse.json({ error: "Protected user not found" }, { status: 404 });
    }

    const { getProtectedUsers } = await import("@/lib/dal/protection");
    const list = await getProtectedUsers();
    const updated = list.find((u) => u.userId === uid);
    return NextResponse.json(updated ?? { userId: uid });
  } catch (error) {
    console.error("[API] PATCH /api/protection/users/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to update protected user" },
      { status: 500 }
    );
  }
}

/** DELETE /api/protection/users/[userId] - Remove protected user (staff only) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const { userId } = await params;
  const uid = userId.trim();

  try {
    const deleted = await deleteProtectedUser(uid);
    if (!deleted) {
      return NextResponse.json({ error: "Protected user not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] DELETE /api/protection/users/[userId]:", error);
    return NextResponse.json(
      { error: "Failed to delete protected user" },
      { status: 500 }
    );
  }
}
