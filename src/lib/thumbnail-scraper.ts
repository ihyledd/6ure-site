import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const THUMBNAILS_DIR = join(process.cwd(), "public", "uploads", "resource-thumbnails");
const THUMBNAILS_URL_PREFIX = "/uploads/resource-thumbnails/";

/**
 * Downloads an external image and saves it locally in public/uploads/resource-thumbnails/.
 * Returns the local URL path (e.g. /uploads/resource-thumbnails/abc.png).
 * If download fails or URL is already local, returns original URL.
 */
export async function downloadResourceThumbnail(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || !trimmed.startsWith("http")) return trimmed;
  
  // If it's already a local path, skip
  if (trimmed.startsWith("/") || trimmed.includes("/uploads/")) return trimmed;

  if (!existsSync(THUMBNAILS_DIR)) {
    mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }

  try {
    const res = await fetch(trimmed, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RequestsBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      console.warn("[ThumbnailScraper] Download failed HTTP", res.status, "for", trimmed);
      return trimmed;
    }
    
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    
    let ext = "png";
    if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("jpg") || contentType.includes("jpeg")) ext = "jpg";
    
    const hash = crypto.createHash("md5").update(trimmed).digest("hex");
    const filename = `${hash}.${ext}`;
    const filepath = join(THUMBNAILS_DIR, filename);
    
    writeFileSync(filepath, buffer);
    return `${THUMBNAILS_URL_PREFIX}${filename}`;
  } catch (err) {
    console.error("[ThumbnailScraper] Failed to download:", trimmed, (err as Error).message);
    return trimmed;
  }
}
