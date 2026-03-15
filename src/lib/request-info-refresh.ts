/**
 * Refresh missing request info when the scraper was offline at create time.
 * Runs in background: re-fetches creator data (TikTok/YouTube) and/or product data (title, description, image).
 */

import { query } from "@/lib/db";
import { updateRequest } from "@/lib/requests-api";
import { enrichCreator, isAllowedCreatorDomain, scrapeProduct, getDisplayImageUrl } from "@/lib/scraper";

const DELAY_BETWEEN_ITEMS_MS = 400;
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Requests with TikTok/YouTube creator_url but missing creator_avatar or creator_name. */
async function getRequestsWithMissingCreatorInfo() {
  return query<{
    id: number;
    creator_url: string;
    creator_name: string | null;
    creator_avatar: string | null;
    creator_platform: string | null;
  }>(
    `SELECT id, creator_url, creator_name, creator_avatar, creator_platform FROM requests
     WHERE status != 'cancelled'
       AND creator_url IS NOT NULL AND TRIM(creator_url) != ''
       AND (creator_url LIKE '%tiktok.com%' OR creator_url LIKE '%youtube.com%' OR creator_url LIKE '%youtu.be%')
       AND (creator_avatar IS NULL OR TRIM(COALESCE(creator_avatar, '')) = '' OR creator_name IS NULL OR TRIM(COALESCE(creator_name, '')) = '')`
  );
}

/** Requests missing title, description, image_url or price. */
async function getRequestsWithMissingProductInfo() {
  return query<{
    id: number;
    product_url: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    price: string | null;
  }>(
    `SELECT id, product_url, title, description, image_url, price FROM requests
     WHERE status != 'cancelled'
       AND product_url IS NOT NULL AND TRIM(product_url) != ''
       AND (
         (title IS NULL OR TRIM(COALESCE(title, '')) = '')
         OR (description IS NULL OR TRIM(COALESCE(description, '')) = '')
         OR (image_url IS NULL OR TRIM(COALESCE(image_url, '')) = '')
         OR (price IS NULL OR TRIM(COALESCE(price, '')) = '')
       )`
  );
}

/** Run once: fill missing creator info and missing product info for all affected requests. */
export async function runRequestInfoRefresh(): Promise<void> {
  const apiKey = (process.env.SCRAPE_API_KEY ?? "").trim();
  let creatorUpdated = 0;
  let productUpdated = 0;

  // 1. Missing creator info (avatar/name) – needs SCRAPE_API_KEY for api.hlx.li
  if (apiKey) {
    try {
      const rows = await getRequestsWithMissingCreatorInfo();
      console.log("[RequestInfoRefresh] Filling missing social media creator info for", rows.length, "requests");
      for (const row of rows) {
        const url = (row.creator_url ?? "").trim();
        if (!url || !isAllowedCreatorDomain(url)) continue;
        try {
          const enriched = await enrichCreator(url);
          const hasData =
            (enriched?.avatar ?? enriched?.name ?? enriched?.platform) != null;
          if (!hasData) continue;
          const avatar = enriched?.avatar ?? null;
          const updates: Parameters<typeof updateRequest>[1] = {};
          if (enriched?.name != null) updates.creatorName = enriched.name;
          if (avatar != null) updates.creatorAvatar = avatar;
          if (enriched?.platform != null) updates.creatorPlatform = enriched.platform;
          if (Object.keys(updates).length > 0) {
            console.log("[RequestInfoRefresh] Request", row.id, "social media creator info filled:", Object.keys(updates).join(", "));
            await updateRequest(row.id, updates);
            creatorUpdated++;
          }
        } catch (e) {
          console.warn("[RequestInfoRefresh] Error for request", row.id, (e as Error).message);
        }
        await delay(DELAY_BETWEEN_ITEMS_MS);
      }
    } catch (e) {
      console.warn("[RequestInfoRefresh] getRequestsWithMissingCreatorInfo failed:", (e as Error).message);
    }
  }

  // 2. Missing product info (title, description, image_url)
  try {
    const rows = await getRequestsWithMissingProductInfo();
    console.log("[RequestInfoRefresh] Filling missing product info for", rows.length, "requests");
    for (const row of rows) {
      const productUrl = (row.product_url ?? "").trim();
      if (!productUrl) continue;
      try {
        const scraped = await scrapeProduct(productUrl);
        if (!scraped) continue;
        const updates: Parameters<typeof updateRequest>[1] = {};
        const needsTitle = !row.title || String(row.title).trim() === "";
        const needsDescription = !row.description || String(row.description).trim() === "";
        const needsImage = !row.image_url || String(row.image_url).trim() === "";
        const needsPrice = !row.price || String(row.price).trim() === "";
        if (needsTitle && scraped.title && scraped.title !== "Untitled Product") {
          updates.title = scraped.title.trim().slice(0, 500);
        }
        if (needsDescription && scraped.description) {
          updates.description = scraped.description.trim().slice(0, 10000);
        }
        if (needsImage && scraped.image) {
          updates.imageUrl = getDisplayImageUrl(scraped.image.trim());
        }
        if (needsPrice && scraped.price) {
          updates.price = scraped.price.trim().slice(0, 100);
        }
        if (Object.keys(updates).length > 0) {
          console.log("[RequestInfoRefresh] Request", row.id, "product info filled:", Object.keys(updates).join(", "));
          await updateRequest(row.id, updates);
          productUpdated++;
        }
      } catch (e) {
        console.warn("[RequestInfoRefresh] Product id", row.id, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }
  } catch (e) {
    console.warn("[RequestInfoRefresh] getRequestsWithMissingProductInfo failed:", (e as Error).message);
  }

  if (creatorUpdated > 0 || productUpdated > 0) {
    console.log(
      "[RequestInfoRefresh] Done. Social media creator info updated:",
      creatorUpdated,
      "Product info updated:",
      productUpdated
    );
  }
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

/** Start periodic refresh. Call from instrumentation or server startup. */
export function startRequestInfoRefresh(): void {
  const intervalMs =
    parseInt(process.env.REQUEST_INFO_REFRESH_INTERVAL_MS ?? "", 10) || DEFAULT_INTERVAL_MS;
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  runRequestInfoRefresh().catch(() => {});
  refreshIntervalId = setInterval(() => runRequestInfoRefresh().catch(() => {}), intervalMs);
  console.log("[RequestInfoRefresh] Periodic refresh every", Math.round(intervalMs / 60000), "minutes");
}

/** Stop periodic refresh. */
export function stopRequestInfoRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}
