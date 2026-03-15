/**
 * Utility functions for the requests site.
 */

/** Decode HTML entities like &amp; &euro; &lt; etc. */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== "string") return "";
  const textarea = typeof document !== "undefined"
    ? document.createElement("textarea")
    : null;
  if (textarea) {
    textarea.innerHTML = str;
    return textarea.value;
  }
  // Server-side fallback: basic entity decode
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, "\u00A0")
    .replace(/&euro;/g, "€")
    .replace(/&pound;/g, "£")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Format ISO date for display (e.g. "2 days ago" or "Mar 3, 2025"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[date.getMonth()];
  const d = date.getDate();
  const y = date.getFullYear();
  return `${m} ${d}, ${y}`;
}

/** Return username or "Anonymous". */
export function getDisplayName(username: string | null | undefined): string {
  if (username != null && String(username).trim() !== "") {
    return String(username).trim();
  }
  return "Anonymous";
}

/** Return URL for creator avatar (pass through if valid, null if empty). */
export function getCreatorAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u;
}

/** Proxy Boosty images via /api/requests/image-proxy, else return URL. */
export function getRequestImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes("images.boosty.to")) {
      return `/api/requests/image-proxy?url=${encodeURIComponent(u)}`;
    }
  } catch {
    // invalid URL
  }
  return u;
}

/** Build request title from request data. */
export function buildRequestTitle(req: {
  title?: string | null;
  creator_name?: string | null;
}): string {
  const title = req.title?.trim();
  if (title) return title;
  const creator = req.creator_name?.trim();
  if (creator) return `${creator} - Request`;
  return "Untitled Request";
}

/** Build request description for meta/og. */
export function buildRequestDescription(req: {
  title?: string | null;
  description?: string | null;
  creator_name?: string | null;
}): string {
  const parts: string[] = [];
  const title = req.title?.trim();
  if (title) parts.push(title);
  const desc = req.description?.trim();
  if (desc) parts.push(desc.slice(0, 200));
  const creator = req.creator_name?.trim();
  if (creator) parts.push(`Creator: ${creator}`);
  return parts.join(" · ") || "Request";
}

/** Build Discord CDN avatar URL from hash and userId. Used by UserAvatar. */
export function getUserAvatarUrl(avatar: string | null | undefined, userId: string | null | undefined): string | null {
  if (!avatar || typeof avatar !== "string" || !userId) return null;
  const hash = avatar.trim();
  if (!hash) return null;
  if (hash.startsWith("http://") || hash.startsWith("https://")) return hash;
  const ext = hash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=128`;
}

/** Build Discord avatar decoration URL. Used by UserAvatar. */
export function getAvatarDecorationUrl(
  avatarDecoration: string | null | undefined,
  _userId: string | null | undefined
): string | null {
  if (!avatarDecoration || typeof avatarDecoration !== "string") return null;
  const hash = avatarDecoration.trim();
  if (!hash) return null;
  if (hash.startsWith("http://") || hash.startsWith("https://")) return hash;
  return `https://cdn.discordapp.com/avatar-decoration-presets/${hash}.png`;
}
