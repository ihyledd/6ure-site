"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function ExitIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function SignoutPage() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((d) => {
        if (d?.csrfToken) setCsrfToken(d.csrfToken);
      })
      .catch(() => {});
  }, []);

  if (csrfToken === null) {
    return (
      <div className="wiki-signout-page">
        <div className="wiki-signout-card">
          <div className="ure-loader-circle" />
          <p className="ure-loader-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wiki-signout-page">
      <div className="wiki-signout-card">
        <div className="wiki-signout-icon">
          <ExitIcon />
        </div>
        <h1 className="wiki-signout-title">See you next time</h1>
        <p className="wiki-signout-desc">
          Sign out of your account to continue. You can log back in anytime with
          Discord.
        </p>
        <form
          action="/api/auth/signout"
          method="POST"
          className="wiki-signout-form"
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <button type="submit" className="ure-btn-primary wiki-signout-btn">
            Sign out
          </button>
        </form>
        <Link href="/" className="wiki-signout-stay">
          Stay signed in
        </Link>
      </div>
    </div>
  );
}
