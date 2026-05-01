"use client";

import { useState } from "react";
import type { DownloadLinkData } from "./AdGatePage";

interface Props {
  link: DownloadLinkData;
  token?: string;
}

export function DownloadUnlocked({ link, token }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(
    // Use direct URL when available (server sends "" when ad+campaign is active)
    link.download_url || null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
      return;
    }

    if (!token) {
      setError("No download token. Please refresh and try again.");
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch(`/api/download/${link.slug}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setDownloadUrl(data.url);
        window.open(data.url, "_blank");
      } else {
        setError(data.error || "Download failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setDownloading(false);
  }

  return (
    <div className="adgate" data-theme="dark">
      <div className="adgate-bg" />
      <div className="adgate-container">
        <div className="adgate-logo-bar">
          <img src="https://images.6ureleaks.com/gen/6urelogo.png" alt="6ure" className="adgate-logo" />
        </div>

        <div className="adgate-unlocked-card">
          <div className="adgate-unlocked-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 019.9-1"/>
            </svg>
          </div>

          <h1 className="adgate-unlocked-title">Download Ready</h1>

          {link.thumbnail_url && (
            <img src={link.thumbnail_url} alt={link.resource_name} className="adgate-unlocked-thumb" />
          )}

          <div className="adgate-unlocked-meta">
            <h2 className="adgate-unlocked-name">{link.resource_name}</h2>
            {link.editor_name && <p className="adgate-unlocked-editor">by {link.editor_name}</p>}
            {link.description && <p className="adgate-unlocked-desc">{link.description}</p>}
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="adgate-download-btn"
          >
            {downloading ? (
              <>
                <span className="adgate-download-spinner" />
                Preparing download...
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download {link.resource_name}
              </>
            )}
          </button>

          {downloadUrl && downloadUrl !== link.download_url && (
            <a href={downloadUrl} className="adgate-download-fallback" target="_blank" rel="noopener">
              Link not working? Click here
            </a>
          )}

          {error && <p className="adgate-error">{error}</p>}
        </div>

        <div className="adgate-footer">
          <span>© 6ure {new Date().getFullYear()}</span>
          <span>·</span>
          <a href="https://6ureleaks.com" target="_blank" rel="noopener">6ureleaks.com</a>
        </div>
      </div>
    </div>
  );
}
