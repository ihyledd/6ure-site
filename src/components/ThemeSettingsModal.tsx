"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import type { ThemeValue } from "@/components/ThemeProvider";
import { getCookiePreferences, setCookiePreferences, clearCookiePreferences, syncCurrentPrefsToCookie } from "@/lib/cookie-preferences";

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.648 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.652 1.652 0 0 1 1.65-1.65h1.99c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function CookieToggle({
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`ure-cookie-toggle ${checked ? "ure-cookie-toggle-on" : ""} ${disabled ? "ure-cookie-toggle-disabled" : ""}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="ure-cookie-toggle-thumb" />
    </button>
  );
}

type RequestsSettings = {
  anonymous?: string;
  push?: string;
  discordDm?: string;
  discordDmCommentReplies?: string;
  timezone?: string;
  dateFormat?: string;
};

export function ThemeSettingsModal({ isOpen, onClose }: Props) {
  const { themeValue, setThemeValue } = useTheme();
  const router = useRouter();
  const [cookiePrefs, setCookiePrefs] = useState(() => getCookiePreferences());
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [requestsSettings, setRequestsSettings] = useState<RequestsSettings>({});
  const [requestsSaving, setRequestsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCookiePrefs(getCookiePreferences());
      syncCurrentPrefsToCookie();
      fetch("/api/settings")
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: RequestsSettings) => {
          setRequestsSettings(data);
          if (typeof window !== "undefined") {
            if (data.anonymous != null) localStorage.setItem("settings-anonymous-default", data.anonymous);
            if (data.discordDm != null) localStorage.setItem("settings-discord-dm", data.discordDm);
            if (data.discordDmCommentReplies != null) localStorage.setItem("settings-discord-dm-comment-replies", data.discordDmCommentReplies);
            if (data.timezone != null) localStorage.setItem("settings-timezone", data.timezone);
            if (data.dateFormat != null) localStorage.setItem("settings-date-format", data.dateFormat);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleCookiePrefChange = (key: "functional" | "analytics", value: boolean) => {
    const next = setCookiePreferences({ [key]: value });
    setCookiePrefs(next);
  };

  const handleResetCookiePrefs = () => {
    clearCookiePreferences();
    setCookiePrefs(getCookiePreferences());
    onClose();
    router.push("/");
  };

  const saveRequestsSetting = async (key: keyof RequestsSettings, value: string) => {
    const next = { ...requestsSettings, [key]: value };
    setRequestsSettings(next);
    setRequestsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (typeof window !== "undefined") {
        const storageKey =
          key === "anonymous" ? "settings-anonymous-default" :
          key === "discordDm" ? "settings-discord-dm" :
          key === "discordDmCommentReplies" ? "settings-discord-dm-comment-replies" :
          key === "timezone" ? "settings-timezone" :
          key === "dateFormat" ? "settings-date-format" :
          `settings-${key}`;
        localStorage.setItem(storageKey, value);
      }
    } finally {
      setRequestsSaving(false);
    }
  };

  const handleRequestExport = async () => {
    setExportStatus("loading");
    try {
      const res = await fetch("/api/account/export", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setExportStatus("success");
      } else {
        setExportStatus("error");
      }
    } catch {
      setExportStatus("error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="ure-settings-overlay" onClick={onClose} aria-hidden />
      <div className="ure-settings-modal" role="dialog" aria-labelledby="ure-settings-title" aria-modal="true">
        <div className="ure-settings-header">
          <h2 id="ure-settings-title" className="ure-settings-title">Settings</h2>
          <button type="button" className="ure-settings-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="ure-settings-content">
          <div className="ure-settings-category">
            <div className="ure-settings-category-header">
              <span className="ure-settings-category-icon">
                <PaletteIcon />
              </span>
              <h3 className="ure-settings-category-title">Appearance</h3>
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Theme</span>
                <span className="ure-settings-item-description">
                  Choose between dark, light, or follow system preference
                </span>
              </div>
              <select
                className="ure-settings-select"
                value={themeValue}
                onChange={(e) => setThemeValue(e.target.value as ThemeValue)}
                aria-label="Theme"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          <div className="ure-settings-category ure-settings-category-cookies">
            <div className="ure-settings-category-header ure-settings-category-header-with-link">
              <span className="ure-settings-category-icon">
                <InfoIcon />
              </span>
              <h3 className="ure-settings-category-title">Cookie Preferences</h3>
              <Link href="/privacy" className="ure-settings-view-policy" onClick={(e) => e.stopPropagation()}>
                View Policy
              </Link>
            </div>
            <p className="ure-cookie-about">
              We use cookies to provide essential functionality, enhance your experience, and understand how you use our platform. You can customize your preferences below and change them at any time.
            </p>
            <div className="ure-settings-item ure-settings-item-essential">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Essential Cookies</span>
                <span className="ure-settings-item-description">
                  Session and auth; always active for the site to function.
                </span>
              </div>
              <span className="ure-cookie-always-active">Always Active</span>
              <CookieToggle checked onChange={() => {}} aria-label="Essential cookies" disabled />
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Functional Cookies</span>
                <span className="ure-settings-item-description">
                  Theme, Wiki unlocks, Password hub access.
                </span>
              </div>
              <CookieToggle
                checked={cookiePrefs.functional}
                onChange={(v) => handleCookiePrefChange("functional", v)}
                aria-label="Functional cookies"
              />
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Analytics Cookies</span>
                <span className="ure-settings-item-description">
                  Page views and navigation patterns.
                </span>
              </div>
              <CookieToggle
                checked={cookiePrefs.analytics}
                onChange={(v) => handleCookiePrefChange("analytics", v)}
                aria-label="Analytics cookies"
              />
            </div>
            <div className="ure-cookie-status">
              <h4 className="ure-cookie-status-title">Current Status</h4>
              <p className="ure-cookie-status-item">
                <span className={`ure-cookie-status-badge ${cookiePrefs.functional ? "ure-cookie-status-enabled" : "ure-cookie-status-disabled"}`}>Functional</span> {cookiePrefs.functional ? "Enabled" : "Disabled"}
              </p>
              <p className="ure-cookie-status-item">
                <span className={`ure-cookie-status-badge ${cookiePrefs.analytics ? "ure-cookie-status-enabled" : "ure-cookie-status-disabled"}`}>Analytics</span> {cookiePrefs.analytics ? "Enabled" : "Disabled"}
              </p>
              <p className="ure-cookie-status-updated">
                Last updated: {cookiePrefs.lastUpdated ? new Date(cookiePrefs.lastUpdated).toLocaleDateString() : "Never"}
              </p>
            </div>
            <button type="button" className="ure-cookie-reset" onClick={handleResetCookiePrefs}>
              Reset All Preferences
            </button>
          </div>

          <div className="ure-settings-category">
            <div className="ure-settings-category-header">
              <span className="ure-settings-category-icon">
                <ChartIcon />
              </span>
              <h3 className="ure-settings-category-title">Requests</h3>
            </div>
            <p className="ure-account-desc">
              Default preferences for the Requests section. Anonymous default, Discord DMs, timezone, and date format.
            </p>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Anonymous by default</span>
                <span className="ure-settings-item-description">
                  Submit new requests anonymously by default
                </span>
              </div>
              <CookieToggle
                checked={requestsSettings.anonymous === "true"}
                onChange={(v) => saveRequestsSetting("anonymous", v ? "true" : "false")}
                aria-label="Anonymous by default"
              />
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Discord DM (request completed)</span>
                <span className="ure-settings-item-description">
                  Get a Discord DM when your request is completed
                </span>
              </div>
              <CookieToggle
                checked={requestsSettings.discordDm === "true"}
                onChange={(v) => saveRequestsSetting("discordDm", v ? "true" : "false")}
                aria-label="Discord DM when request completed"
              />
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Discord DM (comment replies)</span>
                <span className="ure-settings-item-description">
                  Get a Discord DM when someone replies to your comment
                </span>
              </div>
              <CookieToggle
                checked={requestsSettings.discordDmCommentReplies === "true"}
                onChange={(v) => saveRequestsSetting("discordDmCommentReplies", v ? "true" : "false")}
                aria-label="Discord DM for comment replies"
              />
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Timezone</span>
                <span className="ure-settings-item-description">
                  Display dates in your timezone
                </span>
              </div>
              <select
                className="ure-settings-select"
                value={requestsSettings.timezone ?? "auto"}
                onChange={(e) => saveRequestsSetting("timezone", e.target.value)}
                aria-label="Timezone"
              >
                <option value="auto">Auto (browser)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
            <div className="ure-settings-item">
              <div className="ure-settings-item-content">
                <span className="ure-settings-item-label">Date format</span>
                <span className="ure-settings-item-description">
                  How dates are displayed
                </span>
              </div>
              <select
                className="ure-settings-select"
                value={requestsSettings.dateFormat ?? "relative"}
                onChange={(e) => saveRequestsSetting("dateFormat", e.target.value)}
                aria-label="Date format"
              >
                <option value="relative">Relative (e.g. 2 hours ago)</option>
                <option value="short">Short (e.g. 3/2/2025)</option>
                <option value="long">Long (e.g. March 2, 2025)</option>
              </select>
            </div>
            {requestsSaving && <p className="ure-settings-saving" style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>Saving…</p>}
          </div>

          <div className="ure-settings-category">
            <div className="ure-settings-category-header">
              <span className="ure-settings-category-icon">
                <UserIcon />
              </span>
              <h3 className="ure-settings-category-title">Account</h3>
            </div>
            <p className="ure-account-desc">
              Request a copy of your data (GDPR data portability). Our team will process your request and notify you when your export is ready.
            </p>
            <button
              type="button"
              className="ure-account-export-btn"
              onClick={handleRequestExport}
              disabled={exportStatus === "loading"}
            >
              {exportStatus === "loading" ? "Requesting…" : exportStatus === "success" ? "Request submitted" : "Request Export Data"}
            </button>
            {exportStatus === "success" && (
              <p className="ure-account-export-success">
                Your export request has been submitted. You will receive an email when your data is ready.
              </p>
            )}
            {exportStatus === "error" && (
              <p className="ure-account-export-error">
                Something went wrong. Please try again or contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
