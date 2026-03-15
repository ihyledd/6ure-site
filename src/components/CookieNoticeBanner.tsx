"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "ure-cookie-notice-seen";

export function CookieNoticeBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      setVisible(true);
    } catch {
      setVisible(false);
    }
  }, [mounted]);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handlePreferences = () => {
    window.dispatchEvent(new CustomEvent("ure-open-settings"));
    handleAccept();
  };

  if (!visible) return null;

  return (
    <div className="cookie-notice-banner" role="dialog" aria-label="Cookie notice">
      <div className="cookie-notice-banner-inner">
        <p className="cookie-notice-text">
          We use cookies for essential and optional features. You can change your preferences in Settings.
        </p>
        <div className="cookie-notice-actions">
          <button
            type="button"
            className="cookie-notice-btn cookie-notice-btn-secondary"
            onClick={handlePreferences}
          >
            Preferences
          </button>
          <button
            type="button"
            className="cookie-notice-btn cookie-notice-btn-primary"
            onClick={handleAccept}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
