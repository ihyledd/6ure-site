import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getRequestsList,
  createRequest,
  getRequestById,
  getUpvotedRequestIdsForUser,
  getRequestByCanonicalProductUrl,
  getLeakByProductUrl,
  checkRequestProtection,
  isProtectedUser,
  getRequestCountByUserInLast24Hours,
  getUserFromDb,
} from "@/lib/requests-api";
import { validateRequestUrls } from "@/lib/requests-validate-urls";
import { canonicalProductUrl } from "@/lib/canonical-product-url";
import { checkUserInGuild } from "@/lib/check-in-guild";
import { syncRoles, notifyNewRequest, getBaseUrl } from "@/lib/requests-bot-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const search = searchParams.get("search")?.trim() ?? null;
    const sortBy = searchParams.get("sort") ?? "recent";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    // Run request list + auth in parallel for faster response
    const [result, session] = await Promise.all([
      getRequestsList({ status: status || undefined, page, limit, search, sortBy, order }),
      auth().catch((authErr) => {
        const msg = authErr instanceof Error ? authErr.message : String(authErr);
        console.error("[API] GET /api/requests auth() failed:", msg);
        return null;
      }),
    ]);

    if (session?.user?.id && result.requests.length > 0) {
      try {
        const ids = result.requests.map((r) => r.id);
        const upvotedIds = await getUpvotedRequestIdsForUser(session.user.id, ids);
        for (const r of result.requests) {
          (r as { hasUpvoted?: boolean }).hasUpvoted = upvotedIds.has(r.id);
        }
      } catch (upvoteErr) {
        const msg = upvoteErr instanceof Error ? upvoteErr.message : String(upvoteErr);
        console.error("[API] GET /api/requests getUpvotedRequestIdsForUser failed:", msg);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const errMsg = err.message;
    const errStack = err.stack ?? "";
    console.error("[API] GET /api/requests:", errMsg, errStack);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const logPath = path.join(process.cwd(), "tmp", "api-errors.log");
      const line = `[${new Date().toISOString()}] GET /api/requests: ${errMsg}\n${errStack}\n\n`;
      fs.appendFileSync(logPath, line);
    } catch {
      // Ignore log write failures
    }
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Please log in to submit a request. You can still submit anonymously to hide your name.",
        },
        { status: 401 }
      );
    }

    const inGuild = await checkUserInGuild(session.user.id);
    if (!inGuild) {
      return NextResponse.json(
        { error: "You must be a member of our Discord server to submit requests.", notInGuild: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const creatorUrl = (body.creator_url ?? body.creatorUrl ?? "").trim();
    const productUrl = (body.product_url ?? body.productUrl ?? "").trim();

    if (!creatorUrl || !productUrl) {
      return NextResponse.json(
        { error: "creator_url and product_url are required" },
        { status: 400 }
      );
    }

    const validationErrors = validateRequestUrls(creatorUrl, productUrl);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    const existing = await getRequestByCanonicalProductUrl(productUrl);
    if (existing) {
      return NextResponse.json(
        {
          error: "A request for this product already exists.",
          duplicate: true,
          existingRequestId: existing.id,
        },
        { status: 409 }
      );
    }

    const canonical = canonicalProductUrl(productUrl);
    const leak = await getLeakByProductUrl(canonical || productUrl);
    if (leak) {
      return NextResponse.json(
        { error: "This product is already available.", leaked: true, leak },
        { status: 409 }
      );
    }

    const protection = await checkRequestProtection(creatorUrl, productUrl);
    if (protection.protected) {
      return NextResponse.json(
        {
          error: protection.error ?? "This request is not allowed.",
          protected: true,
        },
        { status: 403 }
      );
    }

    // Sync roles before create so staff/premium limits are fresh
    syncRoles(session.user.id);

    // Check if user is a protected editor (leak_protection flag)
    const userIsProtected = await isProtectedUser(session.user.id);
    if (userIsProtected) {
      return NextResponse.json(
        {
          error:
            "You are protected and unable to request any content.",
          protected: true,
        },
        { status: 403 }
      );
    }

    // Daily request limit: staff unlimited, premium 4, regular 2
    const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const dbUser = await getUserFromDb(session.user.id);
    let userRoles: string[] = [];
    try {
      userRoles = dbUser?.roles
        ? typeof dbUser.roles === "string"
          ? JSON.parse(dbUser.roles || "[]")
          : []
        : [];
    } catch {
      userRoles = [];
    }
    const userIsStaff =
      STAFF_ROLE_IDS.length > 0 &&
      STAFF_ROLE_IDS.some((roleId: string) => userRoles.includes(roleId));
    const userIsPremium = Boolean(dbUser?.patreon_premium);
    const dailyLimit = userIsStaff ? Infinity : userIsPremium ? 4 : 2;

    if (!userIsStaff) {
      const todayCount = await getRequestCountByUserInLast24Hours(
        session.user.id
      );
      if (todayCount >= dailyLimit) {
        return NextResponse.json(
          {
            error: userIsPremium
              ? "You have reached your limit of 4 requests per day. Try again tomorrow."
              : "You have reached your limit of 2 requests per day. Upgrade to Premium for 4 per day, or try again tomorrow.",
            limit: dailyLimit,
            count: todayCount,
          },
          { status: 429 }
        );
      }
    }

    const req = await createRequest({
      userId: session.user.id,
      creatorUrl,
      productUrl,
      title: body.title ?? null,
      description: body.description ?? null,
      imageUrl: body.image_url ?? body.imageUrl ?? null,
      price: body.price ?? null,
      creatorName: body.creator_name ?? body.creatorName ?? null,
      creatorAvatar: body.creator_avatar ?? body.creatorAvatar ?? null,
      creatorPlatform: body.creator_platform ?? body.creatorPlatform ?? null,
      anonymous: Boolean(body.anonymous),
    });

    const newRequest = await getRequestById(req.id);
    const staffChannelId =
      process.env.DISCORD_STAFF_CHANNEL_ID ||
      process.env.DISCORD_NEW_REQUESTS_CHANNEL_ID ||
      "1470297524857475196";
    const baseUrl = getBaseUrl();
    const viewUrl = `${baseUrl}/requests/request/${req.id}`;
    if (newRequest) {
      notifyNewRequest(
        newRequest as unknown as Record<string, unknown>,
        staffChannelId,
        `${baseUrl.replace(/\/$/, "")}/requests`,
        viewUrl
      );
    }

    return NextResponse.json({
      id: req.id,
      message: "Request created",
    });
  } catch (error) {
    console.error("[API] POST /api/requests:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
