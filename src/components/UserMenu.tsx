"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserAvatar } from "@/components/requests/UserAvatar";
import { createPortal } from "react-dom";
import { useRef, useState, useEffect } from "react";
import { ThemeSettingsModal } from "@/components/ThemeSettingsModal";

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={11} height={11}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={12} height={12}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function RequestChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type User = {
  id: string;
  name?: string | null;
  /** Actual Discord @handle for the small text under display name */
  username?: string | null;
  image?: string | null;
  role?: "USER" | "ADMIN";
  patreon_premium?: boolean;
  /** Server boost level (0, 1, 2) from Discord guild membership */
  boost_level?: number;
  /** Discord avatar decoration asset for Nitro profile frames */
  avatar_decoration?: string | null;
};

type RequestsSubLink = { href: string; label: string; highlight?: boolean };

function iconForRequestsLink(href: string) {
  if (href.includes("/requests/faq")) return <QuestionIcon />;
  if (href.includes("/requests/membership")) return <CrownIcon />;
  if (href.includes("/requests/your-requests")) return <ListIcon />;
  if (href.includes("/requests/protected")) return <ShieldIcon />;
  return <RequestChatIcon />;
}

export function UserMenu({
  user,
  requestsSubLinks = [],
}: {
  user: User;
  /** Links from dashboard "Burger menu" setting (FAQ, Your requests, Membership, etc.) */
  requestsSubLinks?: readonly RequestsSubLink[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const callbackUrl =
    pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
      timeoutRef.current = null;
    }, 200);
  };

  const handleClick = () => setOpen((o) => !o);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setSettingsOpen(true);
    };
    window.addEventListener("ure-open-settings", handler);
    return () => window.removeEventListener("ure-open-settings", handler);
  }, []);

  const displayName = user.name ?? "User";
  const handleText = user.username ? `@${user.username}` : null;

  return (
    <div
      className="ure-user-section"
      style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="ure-user-trigger"
        onClick={handleClick}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="ure-user-info">
          <UserAvatar
            avatar={user.image}
            userId={user.id}
            avatarDecoration={user.avatar_decoration}
            size={32}
            displayName={displayName}
            className={user.patreon_premium ? "ure-user-avatar-premium" : ""}
          />
          <span className="ure-user-name">{displayName}</span>
          {user.role === "ADMIN" ? (
            <span className="ure-staff-badge" title="Staff">
              <ShieldIcon /> STAFF
            </span>
          ) : null}
          {user.patreon_premium ? (
            <span className="ure-premium-badge" title="Premium Member">
              ⭐ Premium
            </span>
          ) : null}
          {(user.boost_level ?? 0) > 0 ? (
            <span className="ure-boost-badge" title="Server Boost">
              <BoltIcon /> Boost
            </span>
          ) : null}
        </div>
      </button>

      {open && (
        <div className="ure-user-dropdown">
          <div className="ure-dropdown-header">
            <div className="ure-dropdown-avatar-wrap">
              <UserAvatar
                avatar={user.image}
                userId={user.id}
                avatarDecoration={user.avatar_decoration}
                size={56}
                displayName={displayName}
                className={user.patreon_premium ? "ure-dropdown-avatar-premium" : ""}
              />
              {user.role === "ADMIN" ? (
                <div className="ure-dropdown-avatar-badge ure-dropdown-avatar-badge-staff" title="Staff">
                  <ShieldIcon />
                </div>
              ) : null}
              {user.patreon_premium ? (
                <div className="ure-dropdown-avatar-badge ure-dropdown-avatar-badge-patreon" title="Premium Member">
                  <span style={{ fontSize: 11, lineHeight: 1 }}>⭐</span>
                </div>
              ) : null}
              {(user.boost_level ?? 0) > 0 ? (
                <div className="ure-dropdown-avatar-badge ure-dropdown-avatar-badge-boost" title="Server Boost">
                  <BoltIcon />
                </div>
              ) : null}
            </div>
            <div className="ure-dropdown-user-info">
              <div className="ure-dropdown-username-row">
                <span className="ure-dropdown-username">{displayName}</span>
                {!!user.patreon_premium && (
                  <span className="ure-dropdown-premium-tag">PREMIUM</span>
                )}
              </div>
              {handleText && <div className="ure-dropdown-discord-name">{handleText}</div>}
            </div>
          </div>

          <div className="ure-dropdown-divider" />

          <div className="ure-dropdown-items">
            <button
              type="button"
              className="ure-dropdown-item"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <GearIcon /> Settings
            </button>
            {requestsSubLinks.length > 0 &&
              requestsSubLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ure-dropdown-item${item.highlight ? " ure-dropdown-item-highlight" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {iconForRequestsLink(item.href)} {item.label}
                </Link>
              ))}
            <Link
              href="/apply/status"
              className="ure-dropdown-item"
              onClick={() => setOpen(false)}
            >
              <FormIcon /> Applications
            </Link>
            {user.role === "ADMIN" && (
              <>
                <div className="ure-dropdown-divider-subtle" />
                <Link
                  href="/dashboard"
                  className="ure-dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  <CrownIcon /> Dashboard
                </Link>
              </>
            )}
            <div className="ure-dropdown-divider-subtle" />
            <a
              href={`/api/auth/logout?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="ure-dropdown-item ure-dropdown-item-danger"
              onClick={() => setOpen(false)}
            >
              <LogoutIcon /> Logout
            </a>
          </div>
        </div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          settingsOpen ? (
            <ThemeSettingsModal
              isOpen
              onClose={() => setSettingsOpen(false)}
            />
          ) : null,
          document.body
        )}
    </div>
  );
}
