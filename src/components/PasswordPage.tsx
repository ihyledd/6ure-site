"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCookiePreferences } from "@/lib/cookie-preferences";

function KeyIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

const PASSWORD = process.env.NEXT_PUBLIC_PASSWORD ?? "2026ure";
const LINKVERTISE_URL = "https://direct-link.net/1130895/kfSgMMZRSQcM";
/** Param value Linkvertise must add to destination URL. Set destination to: /password?via=linkvertise */
const VIA_PARAM = process.env.NEXT_PUBLIC_PASSWORD_VIA ?? "linkvertise";
const PW_COOKIE = "pw_via";
const COOKIE_MAX_AGE_DAYS = 1;

/** Linkvertise domains – referrer must come from one of these (can't bypass with ?via=linkvertise alone) */
const LINKVERTISE_DOMAINS = [
  "linkvertise.com",
  "linkvertise.net",
  "direct-link.net",
  "linkvertise.io",
];

function isFromLinkvertise(): boolean {
  if (typeof document === "undefined") return false;
  const ref = document.referrer;
  if (!ref) return false;
  try {
    const host = new URL(ref).hostname.toLowerCase();
    return LINKVERTISE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const FAQ_ITEMS = [
  {
    q: "Why do I have to wait an hour?",
    a: (
      <>
        <strong>We do not have control over this.</strong><br /><br />
        This process is handled automatically by <strong>Linkvertise</strong>, and we cannot override it.<br /><br />
        You may try:
        <ul style={{ margin: "8px 0 8px 18px" }}>
          <li>•  Using a <strong>VPN</strong></li>
          <li>• Switching to a different <strong>browser</strong></li>
          <li>• Accessing from a different <strong>device</strong></li>
        </ul>
        However, these methods are <strong>not guaranteed</strong> to work.<br /><br />
        If a waiting period is still required, <strong>you will need to wait for it to reset.</strong>
      </>
    ),
  },
  {
    q: "Why Linkvertise?",
    a: (
      <>
        <strong>This is required to support the server.</strong><br /><br />
        We receive a small amount from <strong>Linkvertise</strong> for each completed access. This helps cover hosting and maintenance costs.<br /><br />
        Without this support, the service would not be <strong>sustainable long-term</strong>.
      </>
    ),
  },
  {
    q: "Do I have to get the password for every preset?",
    a: (
      <>
        <strong>You only need to obtain the password once.</strong><br /><br />
        It provides access to <strong>all presets for the full year</strong>.<br /><br />
        The password is only changed under specific circumstances, which <strong>rarely occur within the same year</strong>.
      </>
    ),
  },
  {
    q: "Why can't I access directly?",
    a: (
      <>
        <strong>Direct access is blocked.</strong><br /><br />
        You must complete the Linkvertise process first.
      </>
    ),
  },
  {
    q: "Is every preset locked behind a paywall?",
    a: (
      <>
        <strong>This is a one-time step.</strong><br /><br />
        You only complete the Linkvertise process once to receive the password. After that, you gain access to <strong>all presets</strong> - you do not repeat it for every preset.<br /><br />
        The password unlocks everything for the year.
      </>
    ),
  },
];

function FaqSection() {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="pw-faq pw-v2-card">
      <div className="pw-faq-toggle" onClick={() => setOpen(!open)}>
        <span>Frequently Asked Questions</span>
        <span>{open ? "–" : "+"}</span>
      </div>
      <div className={`pw-faq-body${open ? " active" : ""}`}>
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className={`pw-faq-item${activeIdx === i ? " active" : ""}`}
          >
            <div
              className="pw-faq-q"
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            >
              {item.q}
            </div>
            <div className="pw-faq-a">{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GateView() {
  return (
    <>
      <div className="pw-v2-card pw-v2-landing">
        <div className="pw-v2-head">
          <div className="pw-v2-icon" aria-hidden>
            <KeyIcon size={32} />
          </div>
          <h1 className="pw-v2-title">Password Access</h1>
          <p className="pw-v2-sub">Complete Linkvertise to unlock the access password.</p>
        </div>
        <p className="pw-v2-desc">
          To unlock the password, you must go through our official <strong>Linkvertise</strong> page.
          This helps support the server and keeps everything running.
        </p>
        <a href={LINKVERTISE_URL} className="pw-v2-cta" target="_blank" rel="noopener noreferrer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Get Password via Linkvertise
        </a>
        <div className="pw-v2-note">
          If you completed Linkvertise but still see this page, you may have not accessed the page correctly. You must be redirected here through the official Linkvertise page.
          <span className="pw-v2-warn">Direct access will not reveal the password.</span>
        </div>
        <p className="pw-v2-legal">
          By unlocking, you agree to our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      </div>
      <FaqSection />
    </>
  );
}

function RevealView() {
  const [revealed, setRevealed] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const reveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    navigator.clipboard.writeText(PASSWORD).catch(() => {});
    setShowCopied(true);
    timerRef.current = setTimeout(() => setShowCopied(false), 2000);
  }, [revealed]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/password/views", { method: "POST", credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.count === "number") setViewCount(data.count);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="pw-v2-card pw-v2-reveal">
        <div className="pw-v2-head">
          <div className="pw-v2-icon" aria-hidden>
            <KeyIcon size={32} />
          </div>
          <h1 className="pw-v2-title">Password Access</h1>
          <p className="pw-v2-sub">Your password is ready. Click below to reveal and copy.</p>
        </div>
        <div className="pw-v2-password-wrap">
          <div className="pw-v2-password-box" onClick={reveal}>
            {revealed ? PASSWORD : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
          </div>
          <div className="pw-v2-password-hint">Click to reveal &amp; copy</div>
          <div className={`pw-v2-copied${showCopied ? " show" : ""}`}>Copied!</div>
        </div>
        <div className="pw-v2-disclaimer-card">
          <p className="pw-v2-disclaimer">
            Please <strong>do not share</strong> this password outside the server or post it publicly.
            Sharing it <strong>may lead</strong> to a <span className="pw-v2-ban-pill">ban</span>.
          </p>
        </div>
        {viewCount !== null && (
          <div className="pw-v2-visits-wrap">
            <div className="pw-v2-visits-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            {viewCount.toLocaleString()}
            </div>
          </div>
        )}
        <p className="pw-v2-legal">
          By unlocking, you agree to our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
        </p>
      </div>
      <FaqSection />
    </>
  );
}

function hasValidAccess(): boolean {
  if (typeof document === "undefined") return false;
  const c = document.cookie.split("; ").find((r) => r.startsWith(`${PW_COOKIE}=`));
  return c?.split("=")[1] === "1";
}

function setAccessCookie() {
  if (typeof document === "undefined") return;
  if (!getCookiePreferences().functional) return;
  const maxAge = 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS;
  document.cookie = `${PW_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function PasswordPage() {
  const searchParams = useSearchParams();
  const [fromLinkvertise, setFromLinkvertise] = useState<boolean | null>(null);

  useEffect(() => {
    const viaParam = searchParams.get("via");
    const hasParam = viaParam === VIA_PARAM;
    const referrerValid = isFromLinkvertise();
    /* Must have via param AND referrer from Linkvertise - prevents bypass by just adding ?via=linkvertise */
    if (hasParam && referrerValid) {
      setAccessCookie();
      setFromLinkvertise(true);
    } else {
      setFromLinkvertise(false);
    }
  }, [searchParams]);

  if (fromLinkvertise === null) {
    return (
      <div className="pw-page-wrap">
        <Link href="/" className="verify-back-link" aria-label="Back to home">
          ← Back to home
        </Link>
        <div className="pw-v2-wrap">
          <div className="pw-v2-card pw-v2-loading">
            <div className="pw-v2-loading-spinner" aria-hidden />
            <h2 className="pw-v2-loading-title">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-page-wrap">
      <Link href="/" className="verify-back-link" aria-label="Back to home">
        ← Back to home
      </Link>
      <div className="pw-v2-wrap">
        {fromLinkvertise ? <RevealView /> : <GateView />}
      </div>
    </div>
  );
}
