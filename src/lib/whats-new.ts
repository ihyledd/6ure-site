export const WHATS_NEW_VERSION = 2;

export const WHATS_NEW_CONTENT = {
  version: WHATS_NEW_VERSION,
  title: "What's New",
  items: [
    {
      title: "Announcement Bar",
      description: "On the Requests page you'll see announcements, promos, and discounts. Dismiss per session.",
    },
    {
      title: "Contact Modal in Footer",
      description: "Use \"Contact us\" in the footer to send a message without leaving the page.",
    },
    {
      title: "Cookie Notice",
      description: "First-time visitors see a cookie notice. Use Preferences to open Settings and manage cookies.",
    },
    {
      title: "Requests Page Tips",
      description: "A one-time tip on the Requests page shows how to filter and sort. Dismiss to hide.",
    },
    {
      title: "Cookie Preferences",
      description: "Manage Functional and Analytics cookies in Settings.",
    },
    {
      title: "Data Export",
      description: "Request your data from the Account section in Settings.",
    },
    {
      title: "Application Forms",
      description: "New Google Forms-style application builder. Apply from the Apply page and track your status in the user menu.",
    },
  ],
};

const STORAGE_KEY = "ure-whats-new-seen";
const HAS_RETURNED_KEY = "ure-has-returned";

export function getSeenVersion(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === "number" ? parsed.version : null;
  } catch {
    return null;
  }
}

export function setSeenVersion(version: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version }));
  } catch {
    // ignore
  }
}

export function markHasReturned(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HAS_RETURNED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Call when session exists. Schedules setting ure-has-returned after 5s or on page unload. */
export function scheduleMarkReturned(): (() => void) | void {
  if (typeof window === "undefined") return;
  const mark = () => markHasReturned();
  const timer = setTimeout(mark, 5000);
  const onUnload = () => {
    mark();
    window.removeEventListener("beforeunload", onUnload);
  };
  window.addEventListener("beforeunload", onUnload);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("beforeunload", onUnload);
  };
}

export function hasReturned(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HAS_RETURNED_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldShowWhatsNew(hasSession: boolean, pathname: string): boolean {
  if (!hasSession) return false;
  if (pathname.startsWith("/verify")) return false;
  if (!hasReturned()) return false;
  const seen = getSeenVersion();
  return seen === null || seen < WHATS_NEW_VERSION;
}
