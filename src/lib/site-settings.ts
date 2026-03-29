/**
 * Site settings – read/write site_settings table (key VARCHAR PRIMARY KEY, value TEXT).
 * Uses query, queryOne, execute from @/lib/db.
 */

import { query, queryOne, execute } from "@/lib/db";

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

export async function getSiteSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    `SELECT value FROM site_settings WHERE \`key\` = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO site_settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [key, value]
  );
}

export async function getSiteSettingsByPrefix(
  prefix: string
): Promise<Record<string, string>> {
  const pattern = prefix.endsWith("%") ? prefix : `${prefix}%`;
  const rows = await query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM site_settings WHERE \`key\` LIKE ?`,
    [pattern]
  );
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Requests display settings
// ---------------------------------------------------------------------------

const REQUESTS_DISPLAY_KEYS = [
  "quick_links_position",
  "staff_badge_visible",
  "burger_menu_items",
] as const;

const REQUESTS_DISPLAY_DEFAULTS: Record<string, string> = {
  quick_links_position: "sidebar",
  staff_badge_visible: "false",
  burger_menu_items: "[]",
};

export async function getRequestsDisplaySettings(): Promise<
  Record<string, string>
> {
  const out = { ...REQUESTS_DISPLAY_DEFAULTS };
  const rows = await query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM site_settings WHERE \`key\` IN (?, ?, ?)`,
    [...REQUESTS_DISPLAY_KEYS]
  );
  for (const row of rows) {
    out[row.key] = row.value;
  }
  return out;
}

export async function updateRequestsDisplaySettings(
  data: Record<string, string>
): Promise<void> {
  for (const k of REQUESTS_DISPLAY_KEYS) {
    if (k in data) {
      await setSiteSetting(k, String(data[k]));
    }
  }
}

// ---------------------------------------------------------------------------
// Embed settings (Discord bot embeds)
// ---------------------------------------------------------------------------

export const EMBED_DEFAULTS: Record<string, string> = {
  embed_new_request_title: "A new request has been created!",
  embed_new_request_description: "[View on Website]({requestUrl})",
  embed_new_request_color: "0x5865F2",
  embed_new_request_footer: "Request Monitor",
  embed_new_request_footer_icon: "",
  embed_new_request_author_name: "Request Monitor",
  embed_new_request_author_icon: "",
  embed_new_request_image_enabled: "true",
  embed_new_request_thumbnail_enabled: "false",
  embed_new_request_field_1_name: "Product URL",
  embed_new_request_field_2_name: "Creator",
  embed_new_request_field_3_name: "Status",
  embed_new_request_field_4_name: "Upvotes",
  embed_new_request_field_5_name: "Request ID",
  embed_new_request_field_6_name: "User",
  embed_new_request_field_views_name: "Views",
  embed_comment_reply_title: "💬 Someone replied to your comment",
  embed_comment_reply_description:
    "You received a reply on the request **{requestTitle}**.",
  embed_comment_reply_color: "0x5865F2",
  embed_comment_reply_footer: "6ure Requests · Comment reply",
  embed_comment_reply_footer_icon: "",
  embed_comment_reply_author_name: "",
  embed_comment_reply_author_icon: "",
  embed_comment_reply_field_1_name: "Reply",
  embed_comment_reply_field_2_name: "From",
  embed_comment_reply_field_3_name: "View comment",
  embed_completed_dm_title: "Request Completed!",
  embed_completed_dm_description: "Your request has been marked as completed.",
  embed_completed_dm_color: "0x57F287",
  embed_completed_dm_footer: "",
  embed_completed_dm_footer_icon: "",
  embed_completed_dm_author_name: "",
  embed_completed_dm_author_icon: "",
  embed_completed_dm_thumbnail_enabled: "true",
  embed_completed_dm_field_1_name: "Request Details",
  embed_completed_dm_field_2_name: "Request Author",
  embed_completed_dm_field_3_name: "Quick Links",
  embed_rejected_dm_title: "Request Rejected",
  embed_rejected_dm_description: "Your request has been rejected.",
  embed_rejected_dm_color: "0xED4245",
  embed_rejected_dm_footer: "",
  embed_rejected_dm_footer_icon: "",
  embed_rejected_dm_author_name: "",
  embed_rejected_dm_author_icon: "",
  embed_rejected_dm_thumbnail_enabled: "true",
  embed_rejected_dm_field_1_name: "Request Details",
  embed_rejected_dm_field_2_name: "Request Author",
  embed_rejected_dm_field_3_name: "Quick Links",
  embed_leak_dm_title: "🎉 Request Leaked!",
  embed_leak_dm_description: "Your requested product has been leaked!",
  embed_leak_dm_color: "0x57F287",
  embed_leak_dm_footer: "",
  embed_leak_dm_footer_icon: "",
  embed_leak_dm_author_name: "",
  embed_leak_dm_author_icon: "",
  embed_leak_dm_thumbnail_enabled: "true",
  embed_leak_dm_field_1_name: "Request Details",
  embed_leak_dm_field_2_name: "Request Author",
  embed_leak_dm_field_3_name: "Links",
  embed_deleted_dm_title: "Request Deleted",
  embed_deleted_dm_description: "Your request was deleted by staff.",
  embed_deleted_dm_color: "0xED4245",
  embed_deleted_dm_footer: "",
  embed_deleted_dm_footer_icon: "",
  embed_deleted_dm_author_name: "",
  embed_deleted_dm_author_icon: "",
  embed_deleted_dm_thumbnail_enabled: "true",
  embed_deleted_dm_field_1_name: "Request title",
  embed_deleted_dm_field_2_name: "Reason",
  embed_deleted_dm_field_3_name: "Request ID",
  embed_cancel_requested_title: "Cancellation requested",
  embed_cancel_requested_description:
    "Requester requested cancellation for request **#{requestId}**.",
  embed_cancel_requested_color: "0xFEE75C",
  embed_cancel_requested_footer: "Request #",
  embed_cancel_requested_footer_icon: "",
  embed_cancel_requested_author_name: "",
  embed_cancel_requested_author_icon: "",
  embed_cancel_requested_field_1_name: "Requester",
  embed_cancel_requested_field_2_name: "Reason",
  embed_cancel_requested_field_3_name: "Request title",
  embed_cancel_requested_field_4_name: "Product URL",
  embed_cancel_approved_title: "Cancellation approved",
  embed_cancel_approved_description:
    "Request **#{requestId}** was cancelled by staff.",
  embed_cancel_approved_color: "0xED4245",
  embed_cancel_approved_footer: "Request #",
  embed_cancel_approved_footer_icon: "",
  embed_cancel_approved_author_name: "",
  embed_cancel_approved_author_icon: "",
  embed_cancel_approved_field_1_name: "Requester",
  embed_cancel_approved_field_2_name: "Approved by",
  embed_cancel_approved_field_3_name: "Reason",
  embed_cancel_approved_field_4_name: "Request title",
  embed_cancel_approved_field_5_name: "Product URL",
  embed_cancel_rejected_title: "Cancellation rejected",
  embed_cancel_rejected_description:
    "Cancellation request for **#{requestId}** was rejected by staff.",
  embed_cancel_rejected_color: "0x57F287",
  embed_cancel_rejected_footer: "Request #",
  embed_cancel_rejected_footer_icon: "",
  embed_cancel_rejected_author_name: "",
  embed_cancel_rejected_author_icon: "",
  embed_cancel_rejected_field_1_name: "Requester",
  embed_cancel_rejected_field_2_name: "Rejected by",
  embed_cancel_rejected_field_reason_name: "Requester's reason",
  embed_cancel_rejected_field_staff_reason_name: "Staff's reason",
  embed_cancel_rejected_field_3_name: "Request title",
  embed_cancel_rejected_field_4_name: "Product URL",
  embed_cancel_approved_dm_title: "Cancellation approved",
  embed_cancel_approved_dm_description:
    "Your cancellation request was approved. The request has been removed.",
  embed_cancel_approved_dm_color: "0x57F287",
  embed_cancel_approved_dm_footer: "Request #",
  embed_cancel_rejected_dm_title: "Cancellation rejected",
  embed_cancel_rejected_dm_description:
    "Your cancellation request was rejected. You can request cancellation again after 24 hours.",
  embed_cancel_rejected_dm_color: "0xED4245",
  embed_cancel_rejected_dm_footer: "Request #",
  embed_cancel_rejected_dm_field_staff_reason_name: "Staff's reason",
  embed_cancel_deleted_title: "Request deleted by staff",
  embed_cancel_deleted_description: "**{title}** was permanently deleted.",
  embed_cancel_deleted_color: "0xED4245",
  embed_cancel_deleted_footer: "Request #",
  embed_cancel_deleted_footer_icon: "",
  embed_cancel_deleted_author_name: "",
  embed_cancel_deleted_author_icon: "",
  embed_cancel_deleted_field_1_name: "Deleted by",
  embed_cancel_deleted_field_2_name: "Requester",
  embed_cancel_deleted_field_3_name: "Request title",
  embed_cancel_deleted_field_4_name: "Reason",
  embed_cancel_deleted_field_5_name: "Product URL",
  embed_staff_request_title: "New request",
  embed_staff_request_color: "0x5865F2",
  embed_staff_request_footer: "Request #",
};

export async function getEmbedSettings(): Promise<Record<string, string>> {
  const dbRows = await getSiteSettingsByPrefix("embed_");
  return { ...EMBED_DEFAULTS, ...dbRows };
}

export async function updateEmbedSettings(
  data: Record<string, string>
): Promise<void> {
  const allowed = new Set(Object.keys(EMBED_DEFAULTS));
  for (const [key, value] of Object.entries(data)) {
    const k = key.startsWith("embed_") ? key : `embed_${key}`;
    if (allowed.has(k)) {
      await setSiteSetting(k, String(value));
    }
  }
}

// ---------------------------------------------------------------------------
// Membership settings (return keys without membership_ prefix for API compatibility)
// ---------------------------------------------------------------------------

const MEMBERSHIP_DEFAULTS_KEYS: Record<string, string> = {
  hero_title: "Choose your membership",
  hero_subtitle:
    "Premium gets you access to leaks and perks. Leak Protection keeps your content safe and off the board.",
  discount_active: "true",
  show_faq: "true",
  basic_card_title: "Basic",
  basic_cta_text: "Get started",
  basic_join_url: "",
  footer_cta_text: "Upgrade Now",
  footer_cta_url: "",
  footer_security_line: "Secure payment via Patreon (monthly) or PayPal (yearly). Refunds available for monthly Patreon only; yearly payments are non-refundable.",
  premium_monthly: "2.40",
  premium_yearly: "28.80",
  premium_old_price: "3",
  premium_save_label: "Save 20%",
  premium_old_price_monthly: "",
  premium_old_price_yearly: "",
  premium_save_label_monthly: "",
  premium_save_label_yearly: "",
  protection_monthly: "6",
  protection_yearly: "55",
  protection_save_label: "$17 off",
  protection_old_price_monthly: "",
  protection_old_price_yearly: "",
  protection_save_label_monthly: "",
  protection_save_label_yearly: "",
  premium_cta_text: "Join Premium",
  protection_cta_text: "Join Leak Protection",
  premium_note:
    "To access all perks, connect your Discord account to Patreon after subscribing.",
  premium_warning: "",
  protection_warning:
    "Must open a ticket in our Discord server before subscribing.",
  protection_note: "",
  protection_legal_note:
    "By subscribing, you agree that a refund will not be issued if you subscribed without first creating a ticket.",
  premium_badge_text: "Most popular",
  protection_badge_text: "",
  premium_card_label: "Access to leaks",
  premium_card_title: "Premium",
  protection_card_label: "Your stuff at all cost",
  protection_card_title: "Leak Protection",
  premium_features:
    '["Instant Access to Leaks","Extra 2x entry to Giveaways","Exclusive Role","Premium Leaks","Priority Request","Discord access"]',
  protection_features:
    '["Complete Leak Removal","Content Request Block","Exclusive Role","Discord access"]',
  premium_join_url: "",
  protection_join_url: "",
};

export const MEMBERSHIP_DEFAULTS = MEMBERSHIP_DEFAULTS_KEYS;

export async function getMembershipSettings(): Promise<Record<string, string>> {
  const dbRows = await getSiteSettingsByPrefix("membership_");
  const out = { ...MEMBERSHIP_DEFAULTS_KEYS };
  for (const [dbKey, value] of Object.entries(dbRows)) {
    const key = dbKey.replace(/^membership_/, "");
    if (key in MEMBERSHIP_DEFAULTS_KEYS) out[key] = value;
  }
  return out;
}

export async function updateMembershipSettings(
  data: Record<string, string>
): Promise<void> {
  const allowed = new Set(Object.keys(MEMBERSHIP_DEFAULTS_KEYS));
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.has(key)) continue;
    const dbKey = key.startsWith("membership_") ? key : `membership_${key}`;
    await setSiteSetting(dbKey, String(value));
  }
}

// ---------------------------------------------------------------------------
// Theme settings
// ---------------------------------------------------------------------------

export type ThemeSettings = {
  theme_active: string;
  theme_winter_snow_enabled: string;
  theme_winter_snow_intensity: string;
  theme_winter_frost_borders: string;
  theme_winter_blue_tint: string;
  theme_winter_snowflake_cursor: string;
  theme_winter_aurora_bg: string;
  theme_spring_green_tint: string;
  theme_spring_blossom_glow: string;
  theme_spring_leaf_cursor: string;
};

const THEME_DEFAULTS: ThemeSettings = {
  theme_active: "default",
  theme_winter_snow_enabled: "true",
  theme_winter_snow_intensity: "50",
  theme_winter_frost_borders: "true",
  theme_winter_blue_tint: "true",
  theme_winter_snowflake_cursor: "false",
  theme_winter_aurora_bg: "true",
  theme_spring_green_tint: "true",
  theme_spring_blossom_glow: "true",
  theme_spring_leaf_cursor: "false",
};

const THEME_KEYS = Object.keys(THEME_DEFAULTS) as (keyof ThemeSettings)[];

export async function getThemeSettings(): Promise<ThemeSettings> {
  const out = { ...THEME_DEFAULTS };
  const placeholders = THEME_KEYS.map(() => "?").join(", ");
  const rows = await query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM site_settings WHERE \`key\` IN (${placeholders})`,
    THEME_KEYS
  );
  for (const row of rows) {
    if (row.key in out) out[row.key as keyof ThemeSettings] = row.value;
  }
  return out;
}

export async function updateThemeSettings(
  data: Partial<ThemeSettings>
): Promise<void> {
  for (const k of THEME_KEYS) {
    if (k in data) {
      const v = data[k as keyof ThemeSettings];
      if (v !== undefined) {
        await setSiteSetting(k, String(v));
      }
    }
  }
}
