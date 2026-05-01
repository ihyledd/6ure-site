/**
 * Ad-gated download system — core utility functions.
 *
 * Token system: HMAC-SHA256 signed tokens prove a user watched the required
 * video duration. The token encodes linkId + timestamp and is validated
 * server-side before revealing the actual download URL.
 */

import { createHmac, createHash, randomBytes } from "crypto";
import { query, queryOne, execute } from "@/lib/db";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Types (match actual snake_case MySQL column names)
// ---------------------------------------------------------------------------

export interface AdCampaignRow {
  id: string;
  name: string;
  is_active: boolean;
  sponsor_enabled: boolean;
  sponsor_name: string | null;
  sponsor_tagline: string | null;
  sponsor_logo_url: string | null;
  sponsor_cta_text: string | null;
  sponsor_cta_url: string | null;
  video_url: string;
  video_duration_secs: number;
  headline_template: string | null;
  subheadline: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdDownloadLinkRow {
  id: string;
  slug: string;
  resource_name: string;
  download_url: string;
  ad_enabled: boolean;
  campaign_id: string | null;
  campaign_mode: "specific" | "random" | "all";
  thumbnail_url: string | null;
  editor_name: string | null;
  description: string | null;
  password: string | null;
  sftpgo_path: string | null;
  total_views: number;
  total_completes: number;
  total_downloads: number;
  is_active: boolean;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdDownloadLinkWithCampaigns extends AdDownloadLinkRow {
  campaign: AdCampaignRow | null;
  allCampaigns?: AdCampaignRow[];
}

// ---------------------------------------------------------------------------
// Token secret — derived from NEXTAUTH_SECRET or a dedicated env var
// ---------------------------------------------------------------------------

function getTokenSecret(): string {
  const secret =
    process.env.AD_DOWNLOAD_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "6ure-ad-download-fallback-secret";
  return secret;
}

// ---------------------------------------------------------------------------
// HMAC token generation & validation
// ---------------------------------------------------------------------------

/**
 * Generate an HMAC-signed download token.
 * Format: `${base64(payload)}.${signature}`
 * Payload: { linkId, issuedAt, expiresAt, nonce }
 */
export function generateDownloadToken(
  linkId: string,
  ttlSeconds = 300
): { token: string; expiresAt: number } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlSeconds;
  const nonce = randomBytes(8).toString("hex");

  const payload = JSON.stringify({ linkId, issuedAt, expiresAt, nonce });
  const payloadB64 = Buffer.from(payload).toString("base64url");

  const sig = createHmac("sha256", getTokenSecret())
    .update(payloadB64)
    .digest("base64url");

  return { token: `${payloadB64}.${sig}`, expiresAt };
}

/**
 * Validate an HMAC-signed download token.
 * Returns the linkId if valid, null otherwise.
 */
export function validateDownloadToken(
  token: string,
  expectedLinkId: string
): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;

    // Verify signature
    const expectedSig = createHmac("sha256", getTokenSecret())
      .update(payloadB64)
      .digest("base64url");
    if (sig !== expectedSig) return false;

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    // Check linkId match
    if (payload.linkId !== expectedLinkId) return false;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.expiresAt) return false;

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GDPR-safe IP hashing
// ---------------------------------------------------------------------------

/**
 * Hash an IP address with a daily-rotating salt for GDPR compliance.
 * Same IP on the same day produces the same hash (for dedup),
 * but cannot be reversed to the original IP.
 */
export function hashIp(ip: string): string {
  const daySalt = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return createHash("sha256").update(`${ip}:${daySalt}`).digest("hex");
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a download link by slug with its campaign data.
 * Returns null if not found, inactive, or expired.
 */
export async function getAdDownloadLink(
  slug: string
): Promise<AdDownloadLinkWithCampaigns | null> {
  const link = await queryOne<AdDownloadLinkRow>(
    `SELECT * FROM ad_download_links WHERE slug = ? AND is_active = 1`,
    [slug]
  );

  if (!link) return null;

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  let campaign: AdCampaignRow | null = null;
  let allCampaigns: AdCampaignRow[] | undefined;

  if (link.ad_enabled) {
    if (link.campaign_mode === "specific" && link.campaign_id) {
      // Specific campaign
      campaign =
        (await queryOne<AdCampaignRow>(
          `SELECT * FROM ad_campaigns WHERE id = ? AND is_active = 1`,
          [link.campaign_id]
        )) ?? null;
    } else if (link.campaign_mode === "random") {
      // Random: pick one active campaign
      const campaigns = await query<AdCampaignRow>(
        `SELECT * FROM ad_campaigns WHERE is_active = 1 ORDER BY RAND() LIMIT 1`
      );
      campaign = campaigns[0] ?? null;
    } else if (link.campaign_mode === "all") {
      // All: return all active campaigns
      allCampaigns = await query<AdCampaignRow>(
        `SELECT * FROM ad_campaigns WHERE is_active = 1 ORDER BY created_at DESC`
      );
      campaign = allCampaigns[0] ?? null;
    }
  }

  return { ...link, campaign, allCampaigns };
}

/**
 * Track an analytics event for a download link.
 */
export async function trackAdEvent(
  linkId: string,
  eventType: "view" | "ad_start" | "ad_complete" | "sponsor_click" | "download",
  request: NextRequest
): Promise<void> {
  const ip = getClientIp(request);
  const ipHashed = hashIp(ip);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const referer = request.headers.get("referer")?.slice(0, 500) ?? null;

  await execute(
    `INSERT INTO ad_analytics_events (id, link_id, event_type, ip_hash, user_agent, referer, created_at)
     VALUES (DEFAULT, ?, ?, ?, ?, ?, NOW())`,
    [linkId, eventType, ipHashed, userAgent, referer]
  );

  // Update denormalized counters
  const counterField =
    eventType === "view"
      ? "total_views"
      : eventType === "ad_complete"
        ? "total_completes"
        : eventType === "download"
          ? "total_downloads"
          : null;

  if (counterField) {
    await execute(
      `UPDATE ad_download_links SET ${counterField} = ${counterField} + 1 WHERE id = ?`,
      [linkId]
    );
  }
}

/**
 * Slugify a string for use as a URL slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}
