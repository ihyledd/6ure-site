/**
 * Canonical product URL for duplicate and leak matching.
 * Strips query and hash, normalizes path (no trailing slash).
 */
export function canonicalProductUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    if (u.port === "80" && u.protocol === "http:") u.port = "";
    if (u.port === "443" && u.protocol === "https:") u.port = "";
    return u.toString();
  } catch {
    return "";
  }
}
