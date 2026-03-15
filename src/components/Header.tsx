import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { HeaderNav } from "@/components/HeaderNav";
import { getSiteSetting, getRequestsDisplaySettings } from "@/lib/site-settings";
import { getDiscordOAuthUrl } from "@/lib/discord-oauth-state";
import { getDiscordLoginUrl } from "@/lib/auth-urls";

const LOGO_SRC = "https://images.6ureleaks.com/logos/Untitled10.png";
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

function parseBurgerMenuItems(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function Header() {
  const [session, discordUrl, headersList, displaySettings] = await Promise.all([
    auth(),
    getSiteSetting("discord_url"),
    headers(),
    getRequestsDisplaySettings(),
  ]);
  const burgerMenuItems = parseBurgerMenuItems(displaySettings.burger_menu_items ?? "[]");

  const pathname = headersList.get("x-pathname") ?? "/";
  const callbackUrl = pathname.startsWith("/") ? `${BASE.replace(/\/$/, "")}${pathname}` : BASE;
  const discordLoginUrl = getDiscordOAuthUrl(callbackUrl) || getDiscordLoginUrl(callbackUrl);

  return (
    <header className="ure-header">
      <div className="ure-header-content">
        <Link href="/" className="ure-logo">
          <Image
            src={LOGO_SRC}
            alt="6ure"
            className="ure-logo-image"
            width={40}
            height={40}
            unoptimized
          />
          <span className="ure-logo-text">6ure</span>
        </Link>

        <input
          type="checkbox"
          id="ure-mobile-nav-toggle"
          className="ure-mobile-toggle"
          aria-hidden
        />
        <label htmlFor="ure-mobile-nav-toggle" className="ure-hamburger" aria-label="Open menu">
          <span className="ure-hamburger-bar" />
          <span className="ure-hamburger-bar" />
          <span className="ure-hamburger-bar" />
        </label>

        <HeaderNav
          session={session}
          discordUrl={discordUrl}
          discordLoginUrl={discordLoginUrl}
          hasAdmin={session?.user?.role === "ADMIN"}
          burgerMenuItems={burgerMenuItems}
        />
      </div>
    </header>
  );
}
