"use client";

import { useCallback, useState } from "react";

type Props = { slug: string; title: string };

export function ArticleActions({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/wiki/p/${slug}` : "";

  const copyLink = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const u = `${window.location.origin}/wiki/p/${slug}`;
    navigator.clipboard.writeText(u).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setOpen(false);
  }, [slug]);

  const share = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title,
        url: `${window.location.origin}/wiki/p/${slug}`,
        text: title,
      }).then(() => setOpen(false)).catch(() => {});
    } else {
      copyLink();
    }
  }, [slug, title, copyLink]);

  const print = useCallback(() => {
    window.print();
    setOpen(false);
  }, []);

  return (
    <div className="wiki-article-actions">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="wiki-article-actions-trigger"
        title="Share, copy link, print"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          <circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
          <circle cx="5" cy="5" r="1"/><circle cx="19" cy="19" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="19" cy="5" r="1"/>
        </svg>
        <span>Share</span>
      </button>
      {open && (
        <>
          <div className="wiki-article-actions-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="wiki-article-actions-dropdown">
            <button type="button" onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            {"share" in navigator && typeof navigator.share === "function" && (
              <button type="button" onClick={share}>Share</button>
            )}
            <button type="button" onClick={print}>Print / PDF</button>
          </div>
        </>
      )}
    </div>
  );
}
