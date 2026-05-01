import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestById, updateRequest } from "@/lib/requests-api";
import { scrapeProduct, enrichCreator, getDisplayImageUrl } from "@/lib/scraper";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 3 per 5 minutes per IP
  const ip = getClientIp(_request);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

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

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const req = await getRequestById(id);
  if (!req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  try {
    const [product, creator] = await Promise.all([
      scrapeProduct(req.product_url),
      enrichCreator(req.creator_url),
    ]);

    const updates: Parameters<typeof updateRequest>[1] = {};
    if (product) {
      if (product.title) updates.title = product.title;
      if (product.description !== undefined) updates.description = product.description;
      if (product.image !== undefined) updates.imageUrl = getDisplayImageUrl(product.image);
      if (product.price !== undefined) updates.price = product.price;
    }
    if (creator.name !== undefined) updates.creatorName = creator.name;
    if (creator.avatar !== undefined) updates.creatorAvatar = creator.avatar;
    if (creator.platform !== undefined) updates.creatorPlatform = creator.platform;

    if (Object.keys(updates).length > 0) {
      await updateRequest(id, updates);
    }

    const updated = await getRequestById(id);
    return NextResponse.json(updated ?? { id });
  } catch (error) {
    console.error("[API] POST /api/requests/[id]/rescrape:", error);
    return NextResponse.json(
      { error: "Failed to re-scrape request" },
      { status: 500 }
    );
  }
}
