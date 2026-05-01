"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthButtons } from "@/components/AuthButtons";
import { UserMenu } from "@/components/UserMenu";
import { WikiMobileDrawer } from "@/components/WikiMobileDrawer";
import { REQUESTS_SUB_LINKS, DEFAULT_BURGER_MENU_SLUGS } from "@/lib/requests-nav";

function parseBurgerMenuItems(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function RequestsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ResourcesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}
function PasswordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function DiscordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

type SessionUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN" | "LEAKER";
  patreon_premium?: boolean;
  leak_protection?: boolean;
  boost_level?: number;
  avatar_decoration?: string | null;
  tags?: string[];
};

type Props = {
  session: { user: SessionUser } | null;
  discordUrl: string | null;
  discordLoginUrl: string;
  hasAdmin: boolean;
  burgerMenuItems?: string[];
};

const DEFAULT_BURGER = DEFAULT_BURGER_MENU_SLUGS;

export function HeaderNav({ session, discordUrl, discordLoginUrl, hasAdmin, burgerMenuItems = [] }: Props) {
  const pathname = usePathname();
  const { data: clientSession, update } = useSession();
  const [mounted, setMounted] = useState(false);
  const [activeBurger, setActiveBurger] = useState<string[]>(DEFAULT_BURGER);

  const serverBurger = burgerMenuItems.length > 0 ? burgerMenuItems : DEFAULT_BURGER;
  const sessionToUse = mounted ? (clientSession ?? session) : session;
  const burgerToUse = mounted ? activeBurger : serverBurger;
  const requestsSubLinks = REQUESTS_SUB_LINKS.filter((l) => burgerToUse.includes(l.slug));

  useEffect(() => {
    setMounted(true);
    setActiveBurger(serverBurger);
  }, []);

  const fetchBurgerSettings = () => {
    fetch("/api/site-settings/requests-display", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { burger_menu_items?: string } | null) => {
        if (data?.burger_menu_items != null) {
          const items = parseBurgerMenuItems(data.burger_menu_items);
          setActiveBurger(items.length > 0 ? items : DEFAULT_BURGER);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!mounted) return;
    fetchBurgerSettings();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchBurgerSettings();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mounted]);

  // Global role refresh: keeps staff/premium/leak flags in sync without sign-out/sign-in.
  // Throttled per-user in localStorage to avoid spamming Discord/API.
  useEffect(() => {
    if (!mounted) return;
    const uid = sessionToUse?.user?.id;
    if (!uid) return;

    const key = `rolesRefreshedAt:${uid}`;
    const now = Date.now();
    const last = Number(localStorage.getItem(key) || "0");
    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
    if (now - last < THROTTLE_MS) return;

    localStorage.setItem(key, String(now));
    fetch("/api/auth/refresh-roles", { method: "POST" })
      .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, body: j })))
      .then(async ({ ok }) => {
        if (ok) {
          // Re-fetch NextAuth session so header updates immediately.
          await update?.();
        }
      })
      .catch(() => {});
  }, [mounted, sessionToUse?.user?.id, update]);

  return (
    <>
      <nav className="ure-header-nav">
        <div className="ure-header-links">
          <Link
            href="/requests"
            className={`ure-header-link${pathname?.startsWith("/requests") ? " active" : ""}`}
            aria-current={pathname?.startsWith("/requests") ? "page" : undefined}
          >
            <RequestsIcon /> Requests
          </Link>
          <Link
            href="/resources"
            className={`ure-header-link${pathname === "/resources" || pathname?.startsWith("/resources/") ? " active" : ""}`}
            aria-current={pathname === "/resources" || pathname?.startsWith("/resources/") ? "page" : undefined}
          >
            <ResourcesIcon /> Resources
          </Link>
          <Link
            href="/password"
            className={`ure-header-link${pathname?.startsWith("/password") ? " active" : ""}`}
            aria-current={pathname?.startsWith("/password") ? "page" : undefined}
          >
            <PasswordIcon /> Password
          </Link>
        </div>
        {discordUrl ? (
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ure-header-link"
            title="Discord"
            aria-label="Discord"
          >
            <DiscordIcon />
          </a>
        ) : null}
        {sessionToUse?.user?.id ? (
          <UserMenu
            user={{
              id: sessionToUse.user.id,
              name: sessionToUse.user.name,
              username: sessionToUse.user.username ?? null,
              image: sessionToUse.user.image,
              role: sessionToUse.user.role,
              patreon_premium: sessionToUse.user.patreon_premium,
              leak_protection: sessionToUse.user.leak_protection,
              boost_level: sessionToUse.user.boost_level,
              avatar_decoration: sessionToUse.user.avatar_decoration ?? null,
              tags: sessionToUse.user.tags ?? [],
            }}
            requestsSubLinks={requestsSubLinks}
          />
        ) : (
          <AuthButtons signedIn={false} discordLoginUrl={discordLoginUrl} />
        )}
      </nav>

      <WikiMobileDrawer
        discordUrl={discordUrl}
        discordLoginUrl={discordLoginUrl}
        hasAdmin={hasAdmin}
        hasSession={!!sessionToUse?.user?.id}
        requestsSubLinks={requestsSubLinks}
      />
    </>
  );
}
