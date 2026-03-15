/** Canonical base URL for auth (same host for all sign-in links so session works across subdomains). */
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

/**
 * Returns the Discord OAuth login URL. Uses DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI from env.
 * Sends user to /api/auth/discord/authorize, which redirects to Discord; after auth, callback is DISCORD_REDIRECT_URI.
 * @param returnTo - Full URL or path where the user should land after OAuth. Path (e.g. /requests) is prefixed with BASE.
 */
export function getDiscordLoginUrl(returnTo: string): string {
  const callbackUrl = returnTo.startsWith("/") ? `${BASE}${returnTo}` : returnTo;
  return `${BASE}/api/auth/discord/authorize?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Default return URL after login (homepage). */
export function getDefaultReturnTo(): string {
  const base = BASE.endsWith("/") ? BASE : `${BASE}/`;
  return base;
}
