"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DISMISSED_KEY = "promo-popup-dismissed-session";

type Popup = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  features: string[];
  ctaText: string | null;
  ctaUrl: string | null;
};

export function PromoPopupBanner() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(DISMISSED_KEY) : null;
    if (raw === "1") {
      setDismissed(true);
      return;
    }
    fetch("/api/promo-popup/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.id) setPopup(data);
      })
      .catch(() => {});
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  if (!popup || dismissed) return null;

  return (
    <div className="promo-popup-overlay" role="dialog" aria-modal="true" aria-label="Promotion">
      <div className="promo-popup-backdrop" onClick={close} aria-hidden />
      <div className="promo-popup-card">
        <button
          type="button"
          onClick={close}
          className="promo-popup-close"
          aria-label="Close"
        >
          ×
        </button>
        {popup.imageUrl && (
          <div className="promo-popup-image-wrap">
            <img src={popup.imageUrl} alt="" className="promo-popup-image" />
          </div>
        )}
        <h3 className="promo-popup-title">{popup.title}</h3>
        {popup.description && (
          <p className="promo-popup-description">{popup.description}</p>
        )}
        {popup.features.length > 0 && (
          <ul className="promo-popup-features">
            {popup.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
        {popup.ctaText && popup.ctaUrl && (
          <Link
            href={popup.ctaUrl}
            className="promo-popup-cta"
            onClick={close}
          >
            {popup.ctaText}
          </Link>
        )}
      </div>
    </div>
  );
}
