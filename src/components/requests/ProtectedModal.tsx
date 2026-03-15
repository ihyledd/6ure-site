"use client";

import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={20} height={20} aria-hidden>
    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface ProtectedModalProps {
  message?: string;
  onClose: () => void;
  popupsOverride?: Record<string, string> | null;
}

export function ProtectedModal({ message, onClose, popupsOverride }: ProtectedModalProps) {
  const merged = { ...DEFAULT_POPUPS, ...(popupsOverride || {}) };
  const title = getPopup("popup_protected_title", merged);
  const explanation = getPopup("popup_protected_explanation", merged);
  const btn = getPopup("popup_protected_btn", merged);

  return (
    <div
      className="requests-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="protected-modal-title"
    >
      <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="requests-modal-close" onClick={onClose} aria-label="Close">
          {CLOSE_ICON}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, color: "var(--text-secondary)" }}>
          {LOCK_ICON}
        </div>
        <h2 id="protected-modal-title" className="requests-modal-title">
          {title}
        </h2>
        {message && (
          <p style={{ margin: "0 0 8px", color: "var(--text-primary)", lineHeight: 1.5 }}>{message}</p>
        )}
        <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>{explanation}</p>
        <div className="requests-modal-actions">
          <button type="button" className="guild-invite-btn guild-invite-btn-primary" onClick={onClose}>
            {btn}
          </button>
        </div>
      </div>
    </div>
  );
}
