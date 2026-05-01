import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  scrapeProduct,
  scrapeOgImageOnly,
  getYouTubeThumbnailForUrl,
  getDisplayImageUrl,
} from "@/lib/scraper";
import { getPriceInEur } from "@/lib/price-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productUrl = String(body.url ?? "").trim();

    if (!productUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const product = await scrapeProduct(productUrl);

    let imageUrl = product?.image || "";
    if (!imageUrl) {
      imageUrl = (await scrapeOgImageOnly(productUrl)) || "";
    }
    if (!imageUrl) {
      imageUrl = (await getYouTubeThumbnailForUrl(productUrl)) || "";
    }
    imageUrl = getDisplayImageUrl(imageUrl);

    let priceNumeric: number | null = null;
    if (product?.price) {
      try { priceNumeric = getPriceInEur(product.price); } catch {}
    }

    return NextResponse.json({
      title: product?.title || null,
      thumbnail: imageUrl || null,
      price: product?.price || null,
      priceNumeric,
    });
  } catch (err) {
    console.error("[scrape-product] Error:", err);
    return NextResponse.json({ error: "Failed to scrape product" }, { status: 500 });
  }
}
