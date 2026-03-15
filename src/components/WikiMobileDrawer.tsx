"use client";

import "@/styles/wiki-mobile-drawer.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { AuthButtons } from "@/components/AuthButtons";

const LOGO_SRC = "https://images.6ureleaks.com/logos/Untitled10.png";

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const REQUEST_ICON = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";

type Props = {
  discordUrl: string | null;
  discordLoginUrl: string;
  hasAdmin: boolean;
  hasSession: boolean;
  /** When on /requests, pass sub-links to show FAQ, Membership, Your requests, etc. in the drawer. */
  requestsSubLinks?: readonly { href: string; label: string; highlight?: boolean }[];
};

export function WikiMobileDrawer({ discordUrl, discordLoginUrl, hasAdmin, hasSession, requestsSubLinks }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = document.getElementById("ure-mobile-nav-toggle") as HTMLInputElement | null;
    if (!el) return;
    const sync = () => setOpen(el.checked);
    sync();
    el.addEventListener("change", sync);
    return () => el.removeEventListener("change", sync);
  }, []);

  if (!mounted || typeof document === "undefined") return null;
  if (!open) return null;

  const navItems = [
    { href: "/requests", label: "Requests", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { href: "/wiki", label: "Wiki", icon: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" },
    { href: "/password", label: "Password", icon: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" },
  ];

  const drawer = (
    <div className="wiki-mobile-drawer-root" role="dialog" aria-modal="true" aria-label="Menu">
      <label
        htmlFor="ure-mobile-nav-toggle"
        className="wiki-mobile-drawer-backdrop"
        aria-label="Close menu"
      />
      <aside className="wiki-mobile-drawer-panel">
        <div className="wiki-mobile-drawer-header">
          <Image src={LOGO_SRC} alt="" width={40} height={40} unoptimized className="wiki-mobile-drawer-logo" />
          <span className="wiki-mobile-drawer-title">6ure</span>
        </div>
        <nav className="wiki-mobile-drawer-nav">
          {navItems.map((item) => (
            <label key={item.href} htmlFor="ure-mobile-nav-toggle" className="wiki-mobile-drawer-item">
              <Link href={item.href} className="wiki-mobile-drawer-link">
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            </label>
          ))}
          {requestsSubLinks && requestsSubLinks.length > 0 && (
            <>
              <div className="wiki-mobile-drawer-section-label" aria-hidden>Requests</div>
              {requestsSubLinks.map((item) => (
                <label key={item.href} htmlFor="ure-mobile-nav-toggle" className="wiki-mobile-drawer-item">
                  <Link
                    href={item.href}
                    className={`wiki-mobile-drawer-link wiki-mobile-drawer-link--sub${item.highlight ? " wiki-mobile-drawer-link--highlight" : ""}`}
                  >
                    <NavIcon d={REQUEST_ICON} />
                    {item.label}
                  </Link>
                </label>
              ))}
            </>
          )}
          {discordUrl && (
            <label htmlFor="ure-mobile-nav-toggle" className="wiki-mobile-drawer-item">
              <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="wiki-mobile-drawer-link">
                <DiscordIcon />
                Discord
              </a>
            </label>
          )}
          {hasAdmin && (
            <label htmlFor="ure-mobile-nav-toggle" className="wiki-mobile-drawer-item">
              <Link href="/dashboard" className="wiki-mobile-drawer-link">
                <NavIcon d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                Admin
              </Link>
            </label>
          )}
          <div className="wiki-mobile-drawer-item">
            <AuthButtons signedIn={hasSession} discordLoginUrl={discordLoginUrl} />
          </div>
        </nav>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
