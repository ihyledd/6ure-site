/**
 * Request create/preview URL validation (Payhip direct link, TikTok/YouTube creator).
 */

import { isAllowedCreatorDomain } from "./scraper";

export function validateRequestUrls(
  creatorUrl: string | null | undefined,
  productUrl: string | null | undefined
): string[] {
  const errors: string[] = [];

  // Payhip: require direct product link (/b/...) not shop link
  if (productUrl?.trim()) {
    try {
      const u = new URL(productUrl.trim());
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "payhip.com") {
        const path = (u.pathname || "").replace(/\/$/, "") || "/";
        if (!/^\/b\/[^/]+/.test(path)) {
          errors.push(
            "Please use the direct product link (e.g. https://payhip.com/b/ProductCode), not the shop or store page link."
          );
        }
      }
    } catch {
      // invalid URL handled below
    }
  }

  // Product URL valid
  if (!productUrl?.trim()) {
    errors.push("Product URL is required");
  } else {
    try {
      const u = new URL(productUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        errors.push("Invalid product URL");
      }
    } catch {
      errors.push("Invalid product URL");
    }
  }

  // Creator URL valid
  if (!creatorUrl?.trim()) {
    errors.push("Creator URL is required");
  } else {
    try {
      const u = new URL(creatorUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        errors.push("Invalid creator URL");
      }
    } catch {
      errors.push("Invalid creator URL");
    }
    if (creatorUrl?.trim() && !isAllowedCreatorDomain(creatorUrl)) {
      errors.push(
        "Creator URL must be TikTok or YouTube only (e.g. tiktok.com/@user, vm.tiktok.com/..., youtube.com/@channel)"
      );
    }
  }

  return errors;
}
