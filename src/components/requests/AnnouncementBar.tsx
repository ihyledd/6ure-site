"use client";

import { useState, useEffect } from "react";
import { BiIcon } from "./BiIcon";
import { MarkdownProse } from "@/components/Markdown";

/** Session-only: dismiss resets when the user opens a new tab/window or refreshes. */
const DISMISSED_KEY = "announcements-dismissed-session";

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<{
    id: number;
    title: string;
    message: string;
    discount_percent?: number | null;
    ends_at?: string | null;
  }[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem(DISMISSED_KEY);
      const ids = raw ? (JSON.parse(raw) as number[]) : [];
      return new Set(ids);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetch("/api/announcements/active")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setAnnouncements(Array.isArray(list) ? list : []))
      .catch(() => setAnnouncements([]));
  }, []);

  const toShow = announcements.filter((a) => !dismissed.has(a.id));
  if (toShow.length === 0) return null;

  const dismiss = (id: number) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  function formatEndsAt(isoDate: string | null | undefined): string {
    if (!isoDate || !isoDate.trim()) return "";
    try {
      const d = new Date(isoDate.trim() + "T12:00:00");
      if (Number.isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return isoDate;
    }
  }

  return (
    <div className="requests-announcement-bar" role="region" aria-label="Announcements">
      {toShow.map((a) => (
        <div key={a.id} className="requests-announcement-item">
          <BiIcon name="megaphone" size={20} className="requests-announcement-icon" aria-hidden />
          <div className="requests-announcement-content">
            {a.discount_percent != null && a.discount_percent > 0 && (
              <span className="requests-announcement-badge">
                {a.discount_percent}% off
              </span>
            )}
            {a.title ? <strong className="requests-announcement-title">{a.title}</strong> : null}
            <div className="requests-announcement-message">
              <MarkdownProse content={a.message} className="requests-announcement-markdown" />
            </div>
            {a.ends_at && (
              <p className="requests-announcement-ends">Ends on the {formatEndsAt(a.ends_at)}.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(a.id)}
            aria-label="Dismiss announcement"
            className="requests-announcement-dismiss"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
