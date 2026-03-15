"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  WHATS_NEW_VERSION,
  WHATS_NEW_CONTENT,
  shouldShowWhatsNew,
  setSeenVersion,
  scheduleMarkReturned,
} from "@/lib/whats-new";

type Props = { hasSession: boolean };

export function WhatsNewBanner({ hasSession }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !hasSession) return;
    const cleanup = scheduleMarkReturned();
    return () => { cleanup?.(); };
  }, [mounted, hasSession]);

  useEffect(() => {
    if (!mounted) return;
    if (shouldShowWhatsNew(hasSession, pathname ?? "")) {
      setOpen(true);
    }
  }, [mounted, hasSession, pathname]);

  const handleDismiss = () => {
    setSeenVersion(WHATS_NEW_VERSION);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="whats-new-backdrop" role="dialog" aria-labelledby="whats-new-title">
      <div className="whats-new-modal">
        <div className="whats-new-header">
          <h2 id="whats-new-title">What&apos;s New</h2>
          <button
            type="button"
            className="whats-new-close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="whats-new-body">
          <ul className="whats-new-list">
            {WHATS_NEW_CONTENT.items.map((item, i) => (
              <li key={i} className="whats-new-item">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="whats-new-footer">
          <button type="button" className="whats-new-btn" onClick={handleDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
