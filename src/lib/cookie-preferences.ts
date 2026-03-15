const STORAGE_KEY = "ure-cookie-prefs";
export const PREFS_COOKIE_NAME = "ure-cookie-prefs";

export type CookiePreferences = {
  functional: boolean;
  analytics: boolean;
  lastUpdated: string | null;
};

const DEFAULTS: CookiePreferences = {
  functional: true,
  analytics: true,
  lastUpdated: null,
};

/** Sync prefs to a cookie so the server can read them on API requests */
function syncPrefsToCookie(prefs: CookiePreferences) {
  if (typeof document === "undefined") return;
  try {
    const value = `${prefs.functional ? "1" : "0"},${prefs.analytics ? "1" : "0"}`;
    document.cookie = `${PREFS_COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    return {
      functional: parsed.functional ?? true,
      analytics: parsed.analytics ?? true,
      lastUpdated: parsed.lastUpdated ?? null,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setCookiePreferences(prefs: Partial<CookiePreferences>): CookiePreferences {
  const current = getCookiePreferences();
  const next: CookiePreferences = {
    ...current,
    ...prefs,
    lastUpdated: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      syncPrefsToCookie(next);
    } catch {}
  }
  return next;
}

export function clearCookiePreferences(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${PREFS_COOKIE_NAME}=; path=/; max-age=0`;
    } catch {}
  }
}

/** Sync current prefs to cookie (e.g. when modal opens, to ensure server has latest) */
export function syncCurrentPrefsToCookie(): void {
  if (typeof window !== "undefined") {
    syncPrefsToCookie(getCookiePreferences());
  }
}

/**
 * Parse cookie preferences from request cookies (server-side).
 * Returns { functional: true, analytics: true } if cookie missing or invalid.
 */
export function parsePrefsFromCookie(cookieHeader: string | null): Pick<CookiePreferences, "functional" | "analytics"> {
  if (!cookieHeader) return { functional: true, analytics: true };
  const match = cookieHeader.split("; ").find((c) => c.startsWith(`${PREFS_COOKIE_NAME}=`));
  if (!match) return { functional: true, analytics: true };
  const value = match.split("=")[1] ?? "";
  const [f, a] = value.split(",");
  return {
    functional: f !== "0",
    analytics: a !== "0",
  };
}
