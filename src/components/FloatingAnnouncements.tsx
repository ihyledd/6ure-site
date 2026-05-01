"use client";

import { useState, useEffect } from "react";
import { BiIcon } from "./requests/BiIcon";
import { MarkdownProse } from "@/components/Markdown";

const READ_KEY = "announcements-read-session";

type Announcement = {
  id: number;
  title: string;
  message: string;
  discount_percent?: number | null;
  ends_at?: string | null;
};

export function FloatingAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [read, setRead] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem(READ_KEY);
      const ids = raw ? (JSON.parse(raw) as number[]) : [];
      return new Set(ids);
    } catch {
      return new Set();
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/announcements/active")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setAnnouncements(Array.isArray(list) ? list : []))
      .catch(() => setAnnouncements([]));
  }, []);

  const unreadCount = announcements.filter((a) => !read.has(a.id)).length;

  const markRead = (id: number) => {
    setRead((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        window.sessionStorage.setItem(READ_KEY, JSON.stringify([...next]));
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

  if (announcements.length === 0) return null;

  return (
    <>
      <span className="wiki-floating-announcements-wrap">
        <span className="wiki-floating-announcements-glow" aria-hidden />
        <button
          type="button"
          className="wiki-floating-announcements"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={unreadCount > 0 ? `Announcements (${unreadCount} unread)` : "Announcements"}
          title="Announcements"
        >
          <BiIcon name="gift" size={20} />
          {unreadCount > 0 && (
            <span className="floating-announcements-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </span>

      {isOpen && (
        <>
          <div
            className="notification-overlay"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />
          <div className="announcement-panel-floating" role="dialog" aria-label="Announcements">
            <div className="announcement-panel-header">
              <h3>Announcements</h3>
              <button
                type="button"
                className="notification-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <BiIcon name="x-lg" size={18} />
              </button>
            </div>
            <div className="announcement-panel-content">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className={`announcement-panel-item ${read.has(a.id) ? "announcement-panel-item-read" : ""}`}
                >
                  {a.discount_percent != null && a.discount_percent > 0 && (
                    <span className="requests-announcement-badge">{a.discount_percent}% off</span>
                  )}
                  {a.title ? <strong className="announcement-panel-item-title">{a.title}</strong> : null}
                  <div className="announcement-panel-item-message">
                    <MarkdownProse content={a.message} className="requests-announcement-markdown" />
                  </div>
                  {a.ends_at && (
                    <p className="requests-announcement-ends">Ends on the {formatEndsAt(a.ends_at)}.</p>
                  )}
                  {read.has(a.id) ? (
                    <span className="announcement-panel-read-done">Read</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(a.id)}
                      className="announcement-panel-read"
                    >
                      Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
