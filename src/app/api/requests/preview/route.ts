import { NextRequest, NextResponse } from "next/server";
import {
  getRequestByCanonicalProductUrl,
  getLeakByProductUrl,
} from "@/lib/requests-api";
import {
  scrapeProduct,
  enrichCreator,
  scrapeOgImageOnly,
  getYouTubeThumbnailForUrl,
  getDisplayImageUrl,
} from "@/lib/scraper";
import { validateRequestUrls } from "@/lib/requests-validate-urls";
import { canonicalProductUrl } from "@/lib/canonical-product-url";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const HLX_API_KEY_MESSAGE =
  "SCRAPE_API_KEY is not set. All api.hlx.li requests require X-API-Key. Please set SCRAPE_API_KEY on the server.";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 per 5 minutes per IP (calls external scraping APIs)
    const ip = getClientIp(request);
    const { success, reset } = sensitiveLimiter.check(ip);
    if (!success) return tooManyRequestsResponse(reset);

    const body = await request.json();
    const productUrl = (body.product_url ?? body.productUrl ?? "").trim();
    const creatorUrl = (body.creator_url ?? body.creatorUrl ?? "").trim();

    const validationErrors = validateRequestUrls(creatorUrl, productUrl);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(", ") },
        { status: 400 }
      );
    }

    const canonical = canonicalProductUrl(productUrl);
    const existing = await getRequestByCanonicalProductUrl(productUrl);
    if (existing) {
      return NextResponse.json(
        {
          error: "A request for this product already exists.",
          duplicate: true,
          existingRequestId: existing.id,
        },
        { status: 400 }
      );
    }

    const leak = await getLeakByProductUrl(canonical || productUrl);
    if (leak) {
      return NextResponse.json({
        leaked: true,
        leak: {
          name: leak.name,
          place: leak.place,
          discordMessageUrl: leak.discordMessageUrl ?? null,
          thumbnail: leak.thumbnail ?? null,
        },
      });
    }

    if (!process.env.SCRAPE_API_KEY?.trim()) {
      return NextResponse.json(
        { error: HLX_API_KEY_MESSAGE },
        { status: 503 }
      );
    }

    const product = await scrapeProduct(productUrl);
    if (!product) {
      return NextResponse.json(
        { error: "Failed to fetch product preview. The URL may be invalid or the service is temporarily unavailable." },
        { status: 502 }
      );
    }

    let imageUrl = product.image || "";
    if (!imageUrl && productUrl) {
      imageUrl = (await scrapeOgImageOnly(productUrl)) || "";
    }
    if (!imageUrl && productUrl) {
      imageUrl = (await getYouTubeThumbnailForUrl(productUrl)) || "";
    }
    imageUrl = getDisplayImageUrl(imageUrl);

    const creator = await enrichCreator(creatorUrl);
    const creatorName = creator.name ?? undefined;
    const creatorAvatar = creator.avatar ?? undefined;
    const creatorPlatform = creator.platform ?? undefined;

    return NextResponse.json({
      title: product.title || "Untitled Product",
      description: product.description || "",
      image_url: imageUrl || null,
      price: product.price || null,
      creator_url: creatorUrl,
      product_url: productUrl,
      creator_name: creatorName,
      creator_avatar: creatorAvatar,
      creator_platform: creatorPlatform,
    });
  } catch (error) {
    console.error("[API] POST /api/requests/preview:", error);
    return NextResponse.json(
      { error: "Failed to preview request" },
      { status: 500 }
    );
  }
}
