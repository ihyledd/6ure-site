/**
 * Default popup strings for the requests section (site-settings popup_* keys).
 * Components merge API result with these defaults so the app works without a popups API.
 */

export const DEFAULT_POPUPS: Record<string, string> = {
  // Guild invite (Discord)
  popup_discord_title_logged_in: "Join our Discord server",
  popup_discord_title_not_logged_in: "Log in & join our Discord",
  popup_discord_desc_logged_in:
    "You need to be a member of our Discord server to submit requests. Join once and you're all set.",
  popup_discord_desc_not_logged_in:
    "Log in with Discord and join our server to submit requests.",
  popup_discord_btn_login: "Login with Discord",
  popup_discord_btn_join: "Join Discord Server",
  popup_discord_btn_ive_joined: "I've joined",
  popup_discord_btn_not_you: "Not you? Log in again",
  popup_discord_hint:
    'After joining, click "I\'ve joined" to continue.',
  popup_discord_invite_url: "https://discord.gg/wFPsTezjeq",

  // Already leaked
  popup_leaked_badge: "Available",
  popup_leaked_message:
    "This resource is already available on our Discord Server. Click the button below to check it out.",
  popup_leaked_btn_open: "Open in Discord",
  popup_leaked_btn_close: "Close",
  popup_leaked_no_link: "Leak link not available.",

  // Protected
  popup_protected_title: "Request Not Allowed",
  popup_protected_explanation:
    "Requests about this creator or content cannot be submitted. If you believe this is an error, please contact support.",
  popup_protected_btn: "Understood",

  // Preview (review request)
  popup_preview_title: "Review Your Request",
  popup_preview_title_hint: "You can edit the title if it's incorrect",
  popup_preview_anonymous: "🔒 This request will be submitted anonymously",
  popup_preview_login_required: "Log in to submit this request.",
  popup_preview_title_placeholder: "Enter request title",
  popup_preview_btn_cancel: "Cancel",
  popup_preview_btn_confirm: "Confirm & Submit",
  popup_preview_creating: "Creating...",
  popup_preview_no_image:
    "No image found for this page (OG/twitter:image)",

  // Premium upsell
  popup_upsell_title: "⭐ Upgrade to Premium",
  popup_upsell_message: "Get priority requests and extra features!",
  popup_upsell_bullet1: "✨ Priority highlighting for your requests",
  popup_upsell_bullet2: "🚀 Faster processing",
  popup_upsell_bullet3: "🎨 Exclusive features",
  popup_upsell_btn_skip: "Maybe Later",
  popup_upsell_btn_upgrade: "Upgrade Now",
  popup_upsell_url: "https://www.patreon.com/cw/6ure",

  // Cancel request
  popup_cancel_title: "Request cancellation",
  popup_cancel_note:
    "Staff must approve your cancellation. A reason is required.",
  popup_cancel_placeholder: "Reason for cancellation...",
  popup_cancel_btn_cancel: "Cancel",
  popup_cancel_btn_submit: "Submit cancellation request",
  popup_cancel_submitting: "Submitting...",

  // Error messages
  popup_error_api_offline:
    "The requests service is currently unavailable. Please try again later.",
  popup_error_scraper_down:
    "The preview service is currently unavailable. The scraper API appears to be down — please try again in a few minutes.",
  popup_error_network:
    "Could not reach the preview service. Please check your connection or try again later.",
};

/** Get a popup string by key; merge with optional API overrides. */
export function getPopup(
  key: keyof typeof DEFAULT_POPUPS | string,
  overrides?: Record<string, string> | null
): string {
  const merged = overrides ? { ...DEFAULT_POPUPS, ...overrides } : DEFAULT_POPUPS;
  return merged[key] ?? DEFAULT_POPUPS[key] ?? "";
}
