/**
 * Product and creator scraping via external API (api.hlx.li).
 * Falls back to direct HTTP fetch when API fails (e.g. Boosty, bot-blocked sites).
 * Uses SCRAPE_API_URL and SCRAPE_API_KEY. Decodes HTML entities in price.
 */

import { load as cheerioLoad, type CheerioAPI } from "cheerio";
import { decodeHtmlEntities } from "./requests-utils";

const SCRAPE_API_URL = (process.env.SCRAPE_API_URL || "https://api.hlx.li/scrape").trim();
const SCRAPE_API_KEY = (process.env.SCRAPE_API_KEY || "").trim();
const SCRAPE_TIMEOUT_MS = Math.max(5000, parseInt(process.env.SCRAPE_TIMEOUT_MS ?? "60000", 10) || 60000);
/** Timeout for enrichCreator (TikTok/YouTube profile). api.hlx.li can be slow; default 25s. */
const ENRICH_CREATOR_TIMEOUT_MS = Math.max(10000, parseInt(process.env.ENRICH_CREATOR_TIMEOUT_MS ?? "25000", 10) || 25000);

/** Extract first match of meta property or name content from HTML */
function getMetaContent(html: string, propertyOrName: string): string {
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${escaped}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${escaped}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : "";
}

/** Extract price from meta or body; decode entities */
function extractPrice(html: string): string {
  let price =
    getMetaContent(html, "og:price:amount") ||
    getMetaContent(html, "product:price:amount") ||
    "";
  const currency =
    getMetaContent(html, "og:price:currency") ||
    getMetaContent(html, "product:price:currency") ||
    "";
  if (price && currency) price = `${price} ${currency}`.trim();
  if (!price) {
    const itemProp = html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']*)["']/i);
    if (itemProp) price = itemProp[1].trim();
  }
  return decodeHtmlEntities(price || "");
}

/** Extract first price-like string from body text (e.g. "8,50 £", "£8.50", "8.50 GBP"). */
function extractPriceFromBodyText($: CheerioAPI): string {
  const bodyText = ($("body").text() || "").replace(/\s+/g, " ");
  const m = bodyText.match(
    /\d{1,6}[,.]\d{1,2}\s*[£$€]|\d{1,6}[,.]\d{1,2}\s*(?:GBP|USD|EUR)|[£$€]\s*\d{1,6}[,.]?\d*|[£$€]\d{1,6}[,.]?\d*/
  );
  return m ? decodeHtmlEntities(m[0].trim()) : "";
}

/**
 * Extract product price from HTML (Cheerio). Used by API path (doFetch) so Shopify and other
 * DOM-based prices are found when api.hlx.li returns full HTML.
 */
function extractProductPriceFromHtml(html: string, pageUrl: string): string {
  if (!html?.trim()) return "";
  const $ = cheerioLoad(html);
  let price = "";
  let hostname = "";
  try {
    hostname = new URL(pageUrl.trim()).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  // Meta
  price = decodeHtmlEntities(
    ($('meta[property="og:price:amount"]').attr("content") || "").trim()
  );
  let currency = decodeHtmlEntities(
    ($('meta[property="og:price:currency"]').attr("content") || "").trim()
  );
  if (price && currency) price = `${price} ${currency}`.trim();
  else if (price) price = price.trim();
  if (!price) {
    price = decodeHtmlEntities(
      ($('meta[property="product:price:amount"]').attr("content") || "").trim()
    );
    currency = decodeHtmlEntities(
      ($('meta[property="product:price:currency"]').attr("content") || "").trim()
    );
    if (price && currency) price = `${price} ${currency}`.trim();
    else if (price) price = price.trim();
  }
  if (!price) {
    const itemProp = $('meta[itemprop="price"]').attr("content") || "";
    if (itemProp.trim()) price = decodeHtmlEntities(itemProp.trim());
  }
  // Generic selectors
  if (!price) {
    const priceSelectors = [
      ".price",
      ".product-price",
      "[data-price]",
      '[class*="price"]',
    ];
    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (el.length) {
        price = (el.text().trim() || el.attr("content") || "").trim();
        if (price) break;
      }
    }
  }
  // JSON-LD
  if (!price) {
    $('script[type="application/ld+json"]').each((_, elem) => {
      if (price) return;
      try {
        const raw = $(elem).html();
        if (!raw) return;
        const json = JSON.parse(raw) as Record<string, unknown>;
        const offers = json.offers as { price?: unknown; priceCurrency?: string } | undefined;
        if (offers?.price) {
          price = String(offers.price);
          if (offers.priceCurrency) price = `${price} ${offers.priceCurrency}`.trim();
        } else if (json.price) {
          price = String(json.price);
        }
      } catch {
        // skip
      }
    });
  }
  // Shopify (span.font-display, etc.) – also for custom domains that use Shopify
  if (!price && (hostname.includes("shopify.com") || html.includes("cdn.shopify.com"))) {
    const fontDisplayText = $("span.font-display").first().text().trim();
    if (
      fontDisplayText &&
      /[£$€]\s*[\d.,]+|[\d.,]+\s*[£$€]/.test(fontDisplayText) &&
      fontDisplayText.length <= 20
    ) {
      price = decodeHtmlEntities(fontDisplayText);
    }
    if (!price) {
      $('span[class*="text-3xl"], span[class*="font-display"]').each((_, el) => {
        if (price) return;
        const t = $(el).text().trim();
        if (
          t &&
          t.length <= 20 &&
          /^[£$€]\s*[\d.,]+$|^[\d.,]+\s*[£$€]$/.test(t)
        ) {
          price = decodeHtmlEntities(t);
        }
      });
    }
  }
  if (!price) price = extractPriceFromBodyText($);
  return decodeHtmlEntities(price.trim());
}

/** Return proxy URL for Boosty images (images.boosty.to) so they load via api.hlx.li. */
export function getBoostyImageProxyUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl?.trim()) return null;
  try {
    const u = new URL(imageUrl.trim());
    if (!u.hostname.includes("images.boosty.to")) return null;
    return `/api/requests/image-proxy?url=${encodeURIComponent(imageUrl.trim())}`;
  } catch {
    return null;
  }
}

/** Return display/storage URL: proxy for Boosty images, else normalized HTTPS. */
export function getDisplayImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl?.trim()) return "";
  const u = imageUrl.trim();
  const proxy = getBoostyImageProxyUrl(u);
  if (proxy) return proxy;
  return normalizeImageToHttps(u) || u;
}

/** Normalize image URL to HTTPS to avoid mixed content warnings. */
export function normalizeImageToHttps(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u || !u.startsWith("http://")) return u;
  return "https://" + u.slice(7);
}

export interface ScrapeProductResult {
  title: string;
  description: string;
  image: string;
  price: string;
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "AbortError") return true;
    if ("code" in err && (err as { code?: number }).code === 23) return true;
  }
  return false;
}

const DIRECT_SCRAPE_TIMEOUT_MS = 15000;

/** Skip logos, favicons, theme assets – for "first image" fallback only. Used by extractProductImageFromHtml. */
function isLikelyNonContentImage(src: string): boolean {
  if (!src || typeof src !== "string") return true;
  const s = src.toLowerCase();
  if (s.startsWith("data:")) return true;
  if (/logo/i.test(s)) return true;
  if (/favicon|apple-touch-icon|touch-icon/i.test(s)) return true;
  if (/\/assets\/logo|\/themes\/[^/]+\/assets\/.*logo/i.test(s)) return true;
  return false;
}

/**
 * Extract best product image URL from HTML. Priority: (1) first img[src*="cdn.shopify.com"],
 * (2) JSON-LD Product/CreativeWork image, (3) og:image/twitter:image, (4) first content-like img.
 * Resolves relative URLs with pageUrl and normalizes to HTTPS.
 */
function extractProductImageFromHtml(html: string, pageUrl: string): string {
  if (!html?.trim() || !pageUrl?.trim()) return "";
  const $ = cheerioLoad(html);
  let image = "";

  // 1. Shopify CDN – product images are reliable
  const shopifyImg = $('img[src*="cdn.shopify.com"]').first().attr("src");
  if (shopifyImg?.trim()) {
    image = shopifyImg.trim();
  }

  // 2. JSON-LD Product / CreativeWork image
  if (!image) {
    $('script[type="application/ld+json"]').each((_, elem) => {
      if (image) return;
      try {
        const raw = $(elem).html();
        if (!raw) return;
        const json = JSON.parse(raw) as Record<string, unknown>;
        const type = json["@type"];
        if ((type === "Product" || type === "CreativeWork") && json.image) {
          const img = json.image;
          if (typeof img === "string") image = img;
          else if (Array.isArray(img) && img[0]) image = String(img[0]);
          else if (img && typeof img === "object" && "url" in img) image = String((img as { url: string }).url);
        }
      } catch {
        // skip invalid JSON
      }
    });
  }

  // 3. og:image / twitter:image
  if (!image) {
    image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('meta[property="twitter:image"]').attr("content") ||
      "";
    image = image.trim();
  }

  // 4. First content-like img
  if (!image) {
    const firstImgSrc = $("img[src]")
      .filter((_, el) => {
        const src = ($(el).attr("src") || "").trim();
        return src.length > 0 && !isLikelyNonContentImage(src);
      })
      .first()
      .attr("src");
    if (firstImgSrc?.trim()) image = firstImgSrc.trim();
  }

  image = image.trim();
  if (!image) return "";
  if (!image.startsWith("http")) {
    try {
      image = new URL(image, pageUrl).href;
    } catch {
      return "";
    }
  }
  return normalizeImageToHttps(image);
}

/**
 * Direct scrape: fetch URL with browser-like User-Agent and parse HTML with cheerio.
 * Fallback when api.hlx.li fails (e.g. Boosty, bot-blocked sites).
 */
async function scrapeProductDirect(url: string): Promise<ScrapeProductResult | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url.trim(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(DIRECT_SCRAPE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html?.trim()) return null;

    const $ = cheerioLoad(html);
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      "";
    let description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";
    let image = extractProductImageFromHtml(html, url.trim());

    // JSON-LD for title/description only (image already handled in extractProductImageFromHtml)
    if (!title || !description) {
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const raw = $(elem).html();
          if (!raw) return;
          const json = JSON.parse(raw) as Record<string, unknown>;
          const type = json["@type"];
          if (type === "Product" || type === "CreativeWork") {
            if (!title && json.name) title = String(json.name);
            if (!description && json.description) description = String(json.description);
          }
        } catch {
          // skip invalid JSON
        }
      });
    }

    if (!title) title = $("title").text() || "";
    if (!description) description = $('meta[name="description"]').attr("content") || "";

    // Platform-specific DOM selectors (title, description, image when still missing)
    let hostname = "";
    try {
      hostname = new URL(url.trim()).hostname.toLowerCase();
    } catch {
      hostname = "";
    }
    if (hostname.includes("payhip.com")) {
      if (!title) title = $("h1.product-title").text() || $(".product-title").text() || "";
      if (!description) description = $(".product-description").text() || "";
      if (!image) image = $(".product-image img").attr("src") || $("img.product-image").attr("src") || "";
    } else if (hostname.includes("patreon.com")) {
      if (!title) title = $('h1[data-tag="post-title"]').text() || $(".post-title").text() || "";
      if (!description) description = $(".post-content").text() || "";
      if (!image) image = $(".post-image img").attr("src") || "";
    } else if (hostname.includes("boosty.to")) {
      if (!image) {
        image =
          $('img[class*="PostSubscriptionBlockBase"]').attr("src") ||
          $('img[class*="module_image"]').attr("src") ||
          $('img[src*="images.boosty.to"]').first().attr("src") ||
          "";
      }
    }

    // Price: meta, DOM selectors, JSON-LD, body regex
    let price = decodeHtmlEntities(
      ($('meta[property="og:price:amount"]').attr("content") || "").trim()
    );
    let currency = decodeHtmlEntities(
      ($('meta[property="og:price:currency"]').attr("content") || "").trim()
    );
    if (price && currency) price = `${price} ${currency}`.trim();
    else if (price) price = price.trim();
    if (!price) {
      price = decodeHtmlEntities(
        ($('meta[property="product:price:amount"]').attr("content") || "").trim()
      );
      currency = decodeHtmlEntities(
        ($('meta[property="product:price:currency"]').attr("content") || "").trim()
      );
      if (price && currency) price = `${price} ${currency}`.trim();
      else if (price) price = price.trim();
    }
    if (!price) {
      const priceSelectors = [
        'meta[itemprop="price"]',
        ".price",
        ".product-price",
        "[data-price]",
        ".amount",
        '[class*="price"]',
        '[id*="price"]',
      ];
      for (const sel of priceSelectors) {
        const el = $(sel).first();
        if (el.length) {
          price = (el.text().trim() || el.attr("content") || "").trim();
          if (price) break;
        }
      }
    }
    if (!price) {
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const raw = $(elem).html();
          if (!raw) return;
          const json = JSON.parse(raw) as Record<string, unknown>;
          const offers = json.offers as { price?: unknown; priceCurrency?: string } | undefined;
          if (offers?.price) {
            price = String(offers.price);
            if (offers.priceCurrency) price = `${price} ${offers.priceCurrency}`.trim();
          } else if (json.price) {
            price = String(json.price);
          }
        } catch {
          // skip
        }
      });
    }
    if (!price && hostname.includes("payhip.com")) {
      price = ($(".price").text() || $("[data-price]").attr("data-price") || "").trim();
    }
    if (!price && hostname.includes("gumroad.com")) {
      price = ($(".product-price").text() || "").trim();
    }
    if (!price && hostname.includes("boosty.to")) {
      const boostyPriceText =
        $('span[class*="PostSubscriptionBlockFooter"]').text() ||
        $('span[class*="module_buttonText"]').text() ||
        $('button[class*="PostSubscriptionBlockFooter"] span').text() ||
        "";
      const priceMatch = boostyPriceText.match(/[\d.,]+\s*[£$€]|[\d.,]+\s*(?:GBP|USD|EUR)|[£$€]\s*[\d.,]+|[£$€][\d.,]+/);
      if (priceMatch) price = priceMatch[0].trim();
    }
    if (!price) {
      const isShopify =
        hostname.includes("shopify.com") || (html && html.includes("cdn.shopify.com"));
      if (isShopify) {
        const fontDisplayText = $("span.font-display").first().text().trim();
        if (
          fontDisplayText &&
          /[£$€]\s*[\d.,]+|[\d.,]+\s*[£$€]/.test(fontDisplayText) &&
          fontDisplayText.length <= 20
        ) {
          price = decodeHtmlEntities(fontDisplayText);
        }
        if (!price) {
          $('span[class*="text-3xl"], span[class*="font-display"]').each((_, el) => {
            if (price) return;
            const t = $(el).text().trim();
            if (
              t &&
              t.length <= 20 &&
              /^[£$€]\s*[\d.,]+$|^[\d.,]+\s*[£$€]$/.test(t)
            ) {
              price = decodeHtmlEntities(t);
            }
          });
        }
      }
    }
    if (!price) price = extractPriceFromBodyText($);

    title = title.trim();
    description = description.trim();
    image = image.trim();
    price = decodeHtmlEntities(price.trim());

    if (!title) return null;

    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = "";
      }
    }
    image = normalizeImageToHttps(image);

    return {
      title,
      description,
      image,
      price,
    };
  } catch (err) {
    console.warn("[Scraper] scrapeProductDirect failed:", url, (err as Error).message);
    return null;
  }
}

/** Scrape product page via API. Returns title, description, image, price. Uses configurable timeout and retries on AbortError. Falls back to direct fetch when API fails. */
export async function scrapeProduct(url: string): Promise<ScrapeProductResult | null> {
  if (!url?.trim()) return null;
  if (!SCRAPE_API_KEY) {
    console.warn("[Scraper] SCRAPE_API_KEY is not set, trying direct scrape");
    return scrapeProductDirect(url.trim());
  }

  const doFetch = async (): Promise<ScrapeProductResult | null> => {
    const fullUrl = `${SCRAPE_API_URL}?url=${encodeURIComponent(url.trim())}`;
    const res = await fetch(fullUrl, {
      headers: {
        "X-API-Key": SCRAPE_API_KEY,
        Accept: "application/json, text/html",
        "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)",
      },
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
    });
    const contentType = res.headers.get("content-type") || "";
    let html: string;
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as Record<string, unknown>;
      html = typeof json.html === "string" ? json.html : String(json);
    } else {
      html = await res.text();
    }
    const title =
      getMetaContent(html, "og:title") ||
      getMetaContent(html, "twitter:title") ||
      (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "");
    const description =
      getMetaContent(html, "og:description") ||
      getMetaContent(html, "twitter:description") ||
      getMetaContent(html, "description") ||
      "";
    const image = extractProductImageFromHtml(html, url.trim());
    const price = extractProductPriceFromHtml(html, url.trim());
    if (!title.trim()) return null;
    return {
      title: title.trim(),
      description: description.trim(),
      image,
      price: price.trim(),
    };
  };

  const maxRetries = 2;
  let result: ScrapeProductResult | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      result = await doFetch();
      if (result) return result;
      break; // API returned but no title – try direct fallback
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = err instanceof Error && "code" in err ? (err as { code?: number }).code : undefined;
      if (isAbortError(err) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn("[Scraper] scrapeProduct timeout, retrying in", delay, "ms (attempt", attempt + 1, "of", maxRetries, ")");
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error("[Scraper] scrapeProduct error:", msg, code != null ? `(code=${code})` : "");
        break;
      }
    }
  }
  // API failed or returned no title – try direct scrape fallback
  console.warn("[Scraper] API failed or no title, trying direct scrape for", url.trim());
  return scrapeProductDirect(url.trim());
}

export interface CreatorEnrichResult {
  name: string | null;
  avatar: string | null;
  platform: "tiktok" | "youtube" | null;
  follower_count?: number;
  video_count?: number | null;
  likes_count?: number | null;
  verified?: boolean | null;
}

/** Check if URL is allowed creator domain (TikTok or YouTube). */
export function isAllowedCreatorDomain(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const tiktok =
      host === "tiktok.com" || host === "vm.tiktok.com" || host.endsWith(".tiktok.com");
    const youtube =
      host === "youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com");
    return tiktok || youtube;
  } catch {
    return false;
  }
}

/** Enrich creator URL via api.hlx.li (TikTok profile or YouTube channel). */
export async function enrichCreator(creatorUrl: string): Promise<CreatorEnrichResult> {
  const empty: CreatorEnrichResult = {
    name: null,
    avatar: null,
    platform: null,
  };
  if (!creatorUrl?.trim() || !SCRAPE_API_KEY) return empty;
  try {
    const u = new URL(creatorUrl.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      const match = u.pathname.match(/\/@([^/]+)/);
      const username = match?.[1];
      if (!username) return empty;
      const res = await fetch(
        `https://api.hlx.li/tiktok/profile?username=${encodeURIComponent(username)}`,
        {
          headers: { "X-API-Key": SCRAPE_API_KEY },
          signal: AbortSignal.timeout(ENRICH_CREATOR_TIMEOUT_MS),
        }
      );
      if (!res.ok) return empty;
      const data = (await res.json()) as Record<string, unknown>;
      if (data?.status !== "success") return empty;

      // Use username (@handle) for the label so the TikTok social link shows e.g. "kurupted", not display name "tafari"
      const tiktokUsername = (data.username as string)?.trim() || username;
      const avatar = (data.avatar as string) || (data.avatarThumb as string) || null;

      const stats = data.stats as { followerCount?: number; heartCount?: number; videoCount?: number } | undefined;

      // Prefer new stats.* fields, but keep backward compatibility with older response shapes.
      const followersFromStats =
        typeof stats?.followerCount === "number" ? stats.followerCount : undefined;
      const followersLegacy =
        typeof (data as { followers?: number }).followers === "number"
          ? (data as { followers?: number }).followers
          : parseInt(String((data as { followers?: unknown; fans?: unknown }).followers ?? (data as { fans?: unknown }).fans ?? 0), 10) || 0;
      const followers = followersFromStats ?? followersLegacy;

      const videoCount =
        typeof stats?.videoCount === "number"
          ? stats.videoCount
          : null;

      const likes =
        typeof stats?.heartCount === "number"
          ? stats.heartCount
          : null;

      return {
        name: tiktokUsername,
        avatar,
        platform: "tiktok",
        follower_count: followers,
        video_count: videoCount ?? undefined,
        likes_count: likes ?? undefined,
        verified: (data as { verified?: boolean | number }).verified === true || (data as { verified?: boolean | number }).verified === 1,
      };
    }
    if (host === "youtube.com" || host === "youtu.be") {
      const res = await fetch(
        `https://api.hlx.li/youtube/channel?url=${encodeURIComponent(creatorUrl.trim())}&max_videos=1`,
        {
          headers: { "X-API-Key": SCRAPE_API_KEY },
          signal: AbortSignal.timeout(ENRICH_CREATOR_TIMEOUT_MS),
        }
      );
      if (!res.ok) return empty;
      const data = (await res.json()) as Record<string, unknown>;
      if (data?.status !== "success") return empty;
      const channel = (data.channel || data) as Record<string, unknown>;
      const name =
        (channel.name as string) ||
        (data.name as string) ||
        (data.uploader as string) ||
        null;
      const thumbnail = (channel.thumbnail as string) || (data.thumbnail as string) || null;
      const subscribers =
        typeof channel.subscriber_count === "number"
          ? channel.subscriber_count
          : parseInt(
              String(
                channel.subscriber_count ??
                  channel.subscribers ??
                  data.subscriber_count ??
                  0
              ),
              10
            ) || 0;
      const videoCount =
        channel.video_count != null
          ? parseInt(String(channel.video_count), 10)
          : null;
      return {
        name,
        avatar: thumbnail,
        platform: "youtube",
        follower_count: subscribers,
        video_count: videoCount ?? undefined,
        verified: channel.verified === true || data.verified === true,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err instanceof Error && "code" in err ? (err as { code?: number }).code : undefined;
    console.error("[Scraper] enrichCreator error:", msg, code != null ? `(code=${code})` : "");
  }
  return empty;
}

/**
 * Lightweight: get og:image / twitter:image from scrape API.
 * Fallback to first content-like img on page when meta tags are empty.
 */
export async function scrapeOgImageOnly(url: string): Promise<string | null> {
  if (!url?.trim() || !SCRAPE_API_KEY) return null;
  try {
    console.log("[Scraper] scrapeOgImageOnly:", url);
    const fullUrl = `${SCRAPE_API_URL.replace(/\/?$/, "")}?url=${encodeURIComponent(url.trim())}`;
    const res = await fetch(fullUrl, {
      headers: {
        "X-API-Key": SCRAPE_API_KEY,
        Accept: "application/json, text/html",
        "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)",
      },
      signal: AbortSignal.timeout(15000),
    });
    const contentType = res.headers.get("content-type") || "";
    let html: string;
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as Record<string, unknown>;
      html = typeof json.html === "string" ? json.html : String(json);
    } else {
      html = await res.text();
    }
    if (!html?.trim()) return null;
    let image =
      getMetaContent(html, "og:image") ||
      getMetaContent(html, "twitter:image") ||
      "";
    if (!image?.trim()) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imgSrc = imgMatch?.[1]?.trim();
      if (imgSrc && !isLikelyNonContentImage(imgSrc)) image = imgSrc;
    }
    image = (image || "").trim();
    if (!image) {
      console.log("[Scraper] scrapeOgImageOnly: no image found for", url);
      return null;
    }
    if (!image.startsWith("http")) {
      try {
        image = new URL(image, url).href;
      } catch {
        return null;
      }
    }
    console.log("[Scraper] scrapeOgImageOnly:", url, "->", image);
    return image;
  } catch (e) {
    console.warn("[Scraper] scrapeOgImageOnly failed:", url, (e as Error).message);
    return null;
  }
}

/** Check if URL is YouTube (channel or video). */
function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
}

/**
 * Get best thumbnail for a YouTube URL (channel or video) from api.hlx.li/youtube/channel.
 * Used as product image fallback when og:image is missing (e.g. YouTube channel pages).
 */
export async function getYouTubeThumbnailForUrl(url: string): Promise<string | null> {
  if (!url?.trim() || !SCRAPE_API_KEY || !isYouTubeUrl(url)) return null;
  try {
    console.log("[Scraper] getYouTubeThumbnailForUrl:", url);
    const res = await fetch(
      `https://api.hlx.li/youtube/channel?url=${encodeURIComponent(url.trim())}&max_videos=1`,
      {
        headers: { "X-API-Key": SCRAPE_API_KEY },
        signal: AbortSignal.timeout(ENRICH_CREATOR_TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data?.status !== "success") return null;
    const latestVideo = data.latest_video as Record<string, unknown> | undefined;
    const channel = (data.channel || data) as Record<string, unknown>;
    const best =
      (latestVideo?.thumbnail as string) ||
      (channel?.thumbnail as string) ||
      (data.thumbnail as string);
    const result = best && typeof best === "string" ? best : null;
    console.log("[Scraper] getYouTubeThumbnailForUrl:", url, "->", result ?? "(none)");
    return result;
  } catch (e) {
    console.warn("[Scraper] getYouTubeThumbnailForUrl failed:", url, (e as Error).message);
    return null;
  }
}
