import { getDiscordOAuthUrl } from "@/lib/discord-oauth-state";
import { getDiscordLoginUrl } from "@/lib/auth-urls";

/**
 * Same Discord login URL as the header "Login with Discord": signed OAuth when
 * configured, else /api/auth/discord/authorize fallback.
 */
export function getDiscordLoginHref(callbackUrl: string): string {
  return getDiscordOAuthUrl(callbackUrl) || getDiscordLoginUrl(callbackUrl);
}
