"use client";

import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface PremiumUpsellModalProps {
  onClose: () => void;
  onUpgrade?: () => void;
  upgradeUrl?: string;
  popupsOverride?: Record<string, string> | null;
}

export function PremiumUpsellModal({
  onClose,
  onUpgrade,
  upgradeUrl,
  popupsOverride,
}: PremiumUpsellModalProps) {
  const merged = { ...DEFAULT_POPUPS, ...(popupsOverride || {}) };
  const title = getPopup("popup_upsell_title", merged);
  const message = getPopup("popup_upsell_message", merged);
  const bullet1 = getPopup("popup_upsell_bullet1", merged);
  const bullet2 = getPopup("popup_upsell_bullet2", merged);
  const bullet3 = getPopup("popup_upsell_bullet3", merged);
  const btnSkip = getPopup("popup_upsell_btn_skip", merged);
  const btnUpgrade = getPopup("popup_upsell_btn_upgrade", merged);
  const url = upgradeUrl ?? (typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_MEMBERSHIP_URL || "/requests/membership") : "/requests/membership");

  const handleUpgrade = () => {
    onUpgrade?.();
    if (typeof window !== "undefined") window.open(url, "_blank");
    onClose();
  };

  return (
    <div
      className="requests-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-modal-title"
    >
      <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="requests-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          {CLOSE_ICON}
        </button>
        <h2 id="upsell-modal-title" className="requests-modal-title">
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {message}
        </p>
        <ul style={{ margin: "0 0 20px", paddingLeft: 20, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          {bullet1 && <li>{bullet1}</li>}
          {bullet2 && <li>{bullet2}</li>}
          {bullet3 && <li>{bullet3}</li>}
        </ul>
        <div className="requests-modal-actions">
          <button
            type="button"
            className="guild-invite-btn guild-invite-btn-secondary"
            onClick={onClose}
          >
            {btnSkip}
          </button>
          <button
            type="button"
            className="guild-invite-btn guild-invite-btn-primary"
            onClick={handleUpgrade}
          >
            {btnUpgrade}
          </button>
        </div>
      </div>
    </div>
  );
}
