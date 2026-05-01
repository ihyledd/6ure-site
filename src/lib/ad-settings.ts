/**
 * Ad-gated download system — site_settings integration.
 * Uses the existing key-value site_settings table for global ad config.
 */

import { getSiteSetting, setSiteSetting, getSiteSettingsByPrefix } from "@/lib/site-settings";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const AD_DEFAULTS: Record<string, string> = {
  ad_global_enabled: "true",
  ad_default_campaign_id: "",
  ad_default_video_duration: "30",
  ad_default_headline: "Watch to Unlock {resourceName}",
  ad_default_subheadline: "PRESENTED BY {sponsorName}",
  ad_fallback_download_message: "Your download is ready!",
  ad_completion_token_ttl: "300",       // 5 minutes
  ad_max_video_size_mb: "100",
  ad_allowed_video_types: "video/mp4,video/webm,video/quicktime",
};

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

export async function getAdGlobalSettings(): Promise<Record<string, string>> {
  const dbRows = await getSiteSettingsByPrefix("ad_");
  const out = { ...AD_DEFAULTS };
  for (const [dbKey, value] of Object.entries(dbRows)) {
    const key = dbKey.replace(/^ad_/, "");
    const fullKey = dbKey;
    if (fullKey in AD_DEFAULTS) out[fullKey] = value;
    else if (`ad_${key}` in AD_DEFAULTS) out[`ad_${key}`] = value;
  }
  return out;
}

export async function updateAdGlobalSettings(
  data: Record<string, string>
): Promise<void> {
  const allowed = new Set(Object.keys(AD_DEFAULTS));
  for (const [key, value] of Object.entries(data)) {
    const k = key.startsWith("ad_") ? key : `ad_${key}`;
    if (allowed.has(k)) {
      await setSiteSetting(k, String(value));
    }
  }
}

export async function getAdSetting(key: string): Promise<string> {
  const fullKey = key.startsWith("ad_") ? key : `ad_${key}`;
  const val = await getSiteSetting(fullKey);
  return val ?? AD_DEFAULTS[fullKey] ?? "";
}
