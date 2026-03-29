"use client";

import { useState, useEffect } from "react";
import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";

const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface GuildInvitePopupProps {
  user: { id: string } | null;
  onClose: () => void;
  onJoinClick?: () => void;
  onIveJoined?: () => Promise<void>;
  onLogin?: () => void;
  inviteUrl?: string;
  popupsOverride?: Record<string, string> | null;
}

export function GuildInvitePopup({
  user,
  onClose,
  onJoinClick,
  onIveJoined,
  onLogin,
  inviteUrl: inviteUrlProp,
  popupsOverride,
}: GuildInvitePopupProps) {
  const [rechecking, setRechecking] = useState(false);
  const [popups, setPopups] = useState<Record<string, string>>(DEFAULT_POPUPS);

  useEffect(() => {
    fetch("/api/site-settings/popups")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setPopups((p) => ({ ...p, ...data })))
      .catch(() => {});
  }, []);

  const merged = { ...popups, ...(popupsOverride || {}) };
  const inviteUrl =
    inviteUrlProp ??
    (getPopup("popup_discord_invite_url", merged) || "https://discord.gg/6ure");
  const isLoggedIn = !!user;

  const handleJoinClick = () => {
    onJoinClick?.();
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
  };

  const handleIveJoined = async () => {
    setRechecking(true);
    try {
      await onIveJoined?.();
    } finally {
      setRechecking(false);
    }
  };

  const title = isLoggedIn
    ? getPopup("popup_discord_title_logged_in", merged)
    : getPopup("popup_discord_title_not_logged_in", merged);
  const desc = isLoggedIn
    ? getPopup("popup_discord_desc_logged_in", merged)
    : getPopup("popup_discord_desc_not_logged_in", merged);

  return (
    <div
      className="guild-invite-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guild-invite-title"
    >
      <div className="guild-invite-popup" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="guild-invite-close"
          onClick={onClose}
          aria-label="Close"
        >
          {CLOSE_ICON}
        </button>

        <div className="guild-invite-glow" aria-hidden />
        <div className="guild-invite-icon-wrap">{DISCORD_ICON}</div>

        <h2 id="guild-invite-title" className="guild-invite-title">
          {title}
        </h2>
        <p className="guild-invite-desc">{desc}</p>

        <div className="guild-invite-actions">
          {!isLoggedIn ? (
            <>
              <button
                type="button"
                className="guild-invite-btn guild-invite-btn-primary"
                onClick={() => onLogin?.()}
              >
                {DISCORD_ICON}
                {getPopup("popup_discord_btn_login", merged)}
              </button>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="guild-invite-btn guild-invite-btn-secondary guild-invite-btn-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleJoinClick();
                }}
              >
                {getPopup("popup_discord_btn_join", merged)}
              </a>
            </>
          ) : (
            <>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="guild-invite-btn guild-invite-btn-primary guild-invite-btn-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleJoinClick();
                }}
              >
                {DISCORD_ICON}
                {getPopup("popup_discord_btn_join", merged)}
              </a>
              <button
                type="button"
                className="guild-invite-btn guild-invite-btn-secondary"
                onClick={handleIveJoined}
                disabled={rechecking}
              >
                {rechecking ? "Checking…" : getPopup("popup_discord_btn_ive_joined", merged)}
              </button>
              <button
                type="button"
                className="guild-invite-btn guild-invite-btn-tertiary"
                onClick={() => onLogin?.()}
              >
                {getPopup("popup_discord_btn_not_you", merged)}
              </button>
            </>
          )}
        </div>

        {isLoggedIn && getPopup("popup_discord_hint", merged) && (
          <p className="guild-invite-hint">
            {getPopup("popup_discord_hint", merged)}
          </p>
        )}
      </div>
    </div>
  );
}
