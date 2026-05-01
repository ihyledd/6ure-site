/**
 * Requests sub-navigation links (Your requests, Discord access, FAQ, etc.).
 * Used in header dropdown and mobile drawer.
 */

export type RequestsSubLink = {
  href: string;
  label: string;
  slug: string;
  highlight?: boolean;
};

export const REQUESTS_SUB_LINKS: RequestsSubLink[] = [
  { href: "/requests/your-requests", label: "Your requests", slug: "your-requests" },
  { href: "/requests/discord-access", label: "Discord access", slug: "discord-access" },
  { href: "/requests/faq", label: "FAQ", slug: "faq" },
  { href: "/requests/protected", label: "Protected", slug: "protected" },
  { href: "/membership", label: "Membership", slug: "membership" },
];

/** Slugs shown in burger menu by default. */
export const DEFAULT_BURGER_MENU_SLUGS = [
  "your-requests",
  "discord-access",
  "faq",
  "protected",
  "membership",
];
