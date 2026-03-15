/**
 * Check product images (requests.image_url) for availability.
 * Runs once at server startup (via instrumentation) and then periodically (IMAGE_AVAILABILITY_REFRESH_INTERVAL_MS).
 * - For requests that have an image: HEAD/GET check; if unreachable (e.g. 404), re-scrape product page and save new image_url.
 * - For requests with no image: try to fetch product image and store it.
 * Social media creator avatars are handled by creator-avatar-refresh.ts only.
 */

import { query, execute } from "@/lib/db";
import {
  scrapeProduct,
  scrapeOgImageOnly,
  getYouTubeThumbnailForUrl,
  getDisplayImageUrl,
} from "@/lib/scraper";

const HEAD_TIMEOUT_MS = 5000;
const GET_TIMEOUT_MS = 8000;
const DELAY_BETWEEN_ITEMS_MS = 350;

/** Check if image URL returns 2xx. Tries HEAD first; falls back to GET (abort after headers) if HEAD is 405 or fails. */
async function isImageUrlReachable(url: string): Promise<boolean> {
  if (!url?.trim()) return false;
  const opts = {
    redirect: "follow" as RequestRedirect,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)" },
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
    const res = await fetch(url.trim(), { method: "HEAD", signal: controller.signal, ...opts });
    clearTimeout(timeout);
    if (res.status >= 200 && res.status < 300) return true;
    if (res.status === 404) return false;
    if (res.status === 405) {
      // Server doesn't support HEAD – try GET and only check status
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), GET_TIMEOUT_MS);
      const res2 = await fetch(url.trim(), { method: "GET", signal: c2.signal, ...opts });
      clearTimeout(t2);
      return res2.status >= 200 && res2.status < 300;
    }
    return false;
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Re-fetch product image via scrape/YouTube fallbacks. */
async function renewProductImage(productUrl: string): Promise<string | null> {
  if (!productUrl?.trim()) return null;
  const scraped = await scrapeProduct(productUrl);
  let image = scraped?.image?.trim() || null;
  if (!image) {
    image = await scrapeOgImageOnly(productUrl);
  }
  if (!image) {
    image = await getYouTubeThumbnailForUrl(productUrl);
  }
  return image || null;
}

/** Run once: check and renew product images. */
export async function runImageAvailabilityRefresh(): Promise<void> {
  const apiKey = (process.env.SCRAPE_API_KEY ?? "").trim();
  if (!apiKey) {
    console.log("[ImageAvailabilityRefresh] SCRAPE_API_KEY not set, skipping.");
    return;
  }

  console.log("[ImageAvailabilityRefresh] Starting product image availability check...");
  let productUpdated = 0;

  try {
    // 1) Requests with an image: check reachability (e.g. 404), re-scrape and save if unreachable
    const productRows = await query<{ id: number; product_url: string; image_url: string }>(
      `SELECT id, product_url, image_url FROM requests
       WHERE status != 'cancelled'
         AND product_url IS NOT NULL AND TRIM(product_url) != ''
         AND image_url IS NOT NULL AND TRIM(image_url) != ''`
    );

    console.log("[ImageAvailabilityRefresh] Checking", productRows.length, "product images...");
    for (const row of productRows) {
      try {
        const imageUrl = (row.image_url ?? "").trim();
        if (!imageUrl) continue;
        // Skip local paths (product images are external)
        if (imageUrl.startsWith("/")) continue;
        const reachable = await isImageUrlReachable(imageUrl);
        if (reachable) continue;

        console.log("[ImageAvailabilityRefresh] Product image unreachable for request", row.id, "| re-fetching");
        const newImage = await renewProductImage(row.product_url);
        if (newImage) {
          const imageToStore = getDisplayImageUrl(newImage);
          if (imageToStore) {
            console.log("[ImageAvailabilityRefresh] Product image renewed for request", row.id);
            await execute("UPDATE requests SET image_url = ?, updated_at = NOW() WHERE id = ?", [
              imageToStore,
              row.id,
            ]);
            productUpdated++;
          }
        } else {
          console.warn("[ImageAvailabilityRefresh] Could not fetch new product image for request", row.id);
        }
      } catch (e) {
        console.warn("[ImageAvailabilityRefresh] Error for request", row.id, (e as Error).message);
      }
      await delay(DELAY_BETWEEN_ITEMS_MS);
    }

    // 2) Requests with no image: try to fetch and store product image
    const missingImageRows = await query<{ id: number; product_url: string }>(
      `SELECT id, product_url FROM requests
       WHERE status != 'cancelled'
         AND product_url IS NOT NULL AND TRIM(product_url) != ''
         AND (image_url IS NULL OR TRIM(COALESCE(image_url, '')) = '')
       LIMIT 100`
    );
    if (missingImageRows.length > 0) {
      console.log("[ImageAvailabilityRefresh] Filling", missingImageRows.length, "requests with missing product image...");
      for (const row of missingImageRows) {
        try {
          const newImage = await renewProductImage(row.product_url);
          if (newImage) {
            const imageToStore = getDisplayImageUrl(newImage);
            if (imageToStore) {
              await execute("UPDATE requests SET image_url = ?, updated_at = NOW() WHERE id = ?", [
                imageToStore,
                row.id,
              ]);
              productUpdated++;
            }
          }
        } catch (e) {
          console.warn("[ImageAvailabilityRefresh] Error filling image for request", row.id, (e as Error).message);
        }
        await delay(DELAY_BETWEEN_ITEMS_MS);
      }
    }

    if (productUpdated > 0) {
      console.log("[ImageAvailabilityRefresh] Done. Product images updated:", productUpdated);
    } else {
      console.log("[ImageAvailabilityRefresh] Done. No product images needed updating.");
    }
  } catch (error) {
    console.error("[ImageAvailabilityRefresh] Job failed:", (error as Error).message);
  }
}

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

/** Start periodic refresh. Call from instrumentation. */
export function startImageAvailabilityRefresh(): void {
  const intervalMs =
    parseInt(process.env.IMAGE_AVAILABILITY_REFRESH_INTERVAL_MS ?? "", 10) || 2 * 60 * 60 * 1000;
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  runImageAvailabilityRefresh().catch(() => {});
  refreshIntervalId = setInterval(() => runImageAvailabilityRefresh().catch(() => {}), intervalMs);
  console.log("[ImageAvailabilityRefresh] Periodic refresh every", Math.round(intervalMs / 60000), "minutes");
}

/** Stop periodic refresh. */
export function stopImageAvailabilityRefresh(): void {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}
