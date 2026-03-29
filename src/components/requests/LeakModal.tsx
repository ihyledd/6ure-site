"use client";

import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface LeakInfo {
  name?: string;
  place?: string;
  discordMessageUrl?: string | null;
  thumbnail?: string | null;
}

export interface LeakModalProps {
  leak: LeakInfo;
  onClose: () => void;
  popupsOverride?: Record<string, string> | null;
}

export function LeakModal({ leak, onClose, popupsOverride }: LeakModalProps) {
  const merged = { ...DEFAULT_POPUPS, ...(popupsOverride || {}) };
  const badge = getPopup("popup_leaked_badge", merged);
  const message = getPopup("popup_leaked_message", merged);
  const btnOpen = getPopup("popup_leaked_btn_open", merged);
  const btnClose = getPopup("popup_leaked_btn_close", merged);
  const noLink = getPopup("popup_leaked_no_link", merged);
  const url = leak.discordMessageUrl?.trim();

  return (
    <div
      className="requests-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leak-modal-title"
    >
      <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="requests-modal-close" onClick={onClose} aria-label="Close">
          {CLOSE_ICON}
        </button>
        <h2 id="leak-modal-title" className="requests-modal-title">
          <span
            style={{
              marginRight: 8,
              padding: "4px 8px",
              borderRadius: 8,
              background: "rgba(16,185,129,0.2)",
              color: "#10b981",
              fontSize: 14,
            }}
          >
            {badge}
          </span>
        </h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{message}</p>
        <div className="requests-modal-actions">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="guild-invite-btn guild-invite-btn-primary guild-invite-btn-link"
              style={{ padding: "12px 20px" }}
            >
              {btnOpen}
            </a>
          ) : (
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{noLink}</span>
          )}
          <button type="button" className="guild-invite-btn guild-invite-btn-secondary" onClick={onClose}>
            {btnClose}
          </button>
        </div>
      </div>
    </div>
  );
}
