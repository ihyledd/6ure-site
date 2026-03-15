import { cookies } from "next/headers";
import { PREFS_COOKIE_NAME } from "@/lib/cookie-preferences";

/** Get cookie preferences from the incoming request (server-side) */
export async function getCookiePrefsFromRequest() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PREFS_COOKIE_NAME)?.value ?? "";
  const [f, a] = raw.split(",");
  return {
    functional: f !== "0",
    analytics: a !== "0",
  };
}
