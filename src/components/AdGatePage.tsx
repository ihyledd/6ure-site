"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DownloadUnlocked } from "./DownloadUnlocked";

export interface CampaignData {
  id: string;
  name: string;
  sponsor_enabled: boolean;
  sponsor_name: string | null;
  sponsor_tagline: string | null;
  sponsor_logo_url: string | null;
  sponsor_cta_text: string | null;
  sponsor_cta_url: string | null;
  video_url: string;
  video_duration_secs: number;
  headline_template: string | null;
  subheadline: string | null;
}

export interface DownloadLinkData {
  id: string;
  slug: string;
  resource_name: string;
  download_url: string;
  ad_enabled: boolean;
  thumbnail_url: string | null;
  editor_name: string | null;
  description: string | null;
  password: string | null;
  campaign: CampaignData | null;
  allCampaigns?: CampaignData[];
}

type GateState = "idle" | "playing" | "paused" | "completed";

export function AdGatePage({ link }: { link: DownloadLinkData }) {
  const campaign = link.campaign!;
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedAtRef = useRef<number>(0);

  const [state, setState] = useState<GateState>("idle");
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordUnlocked, setPasswordUnlocked] = useState(!link.password);

  const requiredDuration = campaign.video_duration_secs;
  const progress = Math.min((watchedSeconds / requiredDuration) * 100, 100);
  const remaining = Math.max(requiredDuration - watchedSeconds, 0);
  const isComplete = watchedSeconds >= requiredDuration;

  // Track page view
  useEffect(() => {
    fetch(`/api/download/${link.slug}/view`, { method: "POST" }).catch(() => {});
  }, [link.slug]);

  // Tab visibility detection
  useEffect(() => {
    function handleVisibility() {
      const visible = document.visibilityState === "visible";
      setIsTabVisible(visible);
      if (!visible && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Timer — counts only when video is actually playing + tab visible
  useEffect(() => {
    if (state !== "playing" || !isTabVisible || isComplete) return;
    const interval = setInterval(() => {
      setWatchedSeconds((prev) => {
        const next = prev + 1;
        if (next >= requiredDuration) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, isTabVisible, isComplete, requiredDuration]);

  // Auto-complete when timer hits target
  useEffect(() => {
    if (isComplete && !downloadToken) {
      completeAd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const startVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    startedAtRef.current = Math.floor(Date.now() / 1000);
    video.play().then(() => {
      setState("playing");
      // Track ad start
      fetch(`/api/download/${link.slug}/view`, { method: "POST" }).catch(() => {});
    }).catch(() => {
      setError("Could not play video. Please click to allow autoplay.");
    });
  }, [link.slug]);

  function handlePause() {
    if (isComplete) return;
    setState("paused");
  }

  function handlePlay() {
    setState("playing");
  }

  // Anti-seek: prevent jumping ahead
  function handleSeeking() {
    const video = videoRef.current;
    if (!video) return;
    // Only allow seeking to positions already watched
    if (video.currentTime > watchedSeconds + 2) {
      video.currentTime = watchedSeconds;
    }
  }

  async function completeAd() {
    try {
      const res = await fetch(`/api/download/${link.slug}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt: startedAtRef.current }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setDownloadToken(data.token);
        setState("completed");
      } else {
        setError(data.error || "Failed to validate completion");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function handleSponsorClick() {
    fetch(`/api/download/${link.slug}/sponsor-click`, { method: "POST" }).catch(() => {});
    if (campaign.sponsor_cta_url) {
      window.open(campaign.sponsor_cta_url, "_blank", "noopener");
    }
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === link.password) {
      setPasswordUnlocked(true);
    } else {
      setError("Incorrect password");
    }
  }

  // Resolve templates
  const headline = (campaign.headline_template ?? "Watch to Unlock {resourceName}")
    .replace("{resourceName}", link.resource_name);
  const subheadline = (campaign.subheadline ?? "")
    .replace("{sponsorName}", campaign.sponsor_name ?? "");

  // If completed, show unlocked view
  if (state === "completed" && downloadToken) {
    return <DownloadUnlocked link={link} token={downloadToken} />;
  }

  // Password gate
  if (!passwordUnlocked) {
    return (
      <div className="adgate" data-theme="dark">
        <div className="adgate-bg" />
        <div className="adgate-container">
          <div className="adgate-logo-bar">
            <img src="https://images.6ureleaks.com/gen/6urelogo.png" alt="6ure" className="adgate-logo" />
          </div>
          <div className="adgate-password-card">
            <h2 className="adgate-password-title">This download is password protected</h2>
            <form onSubmit={handlePasswordSubmit} className="adgate-password-form">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="adgate-password-input"
                autoFocus
              />
              <button type="submit" className="adgate-password-btn">Unlock</button>
            </form>
            {error && <p className="adgate-error">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adgate" data-theme="dark">
      {/* Ambient background */}
      <div className="adgate-bg" />

      <div className="adgate-container">
        {/* Logo bar */}
        <div className="adgate-logo-bar">
          <img src="https://images.6ureleaks.com/gen/6urelogo.png" alt="6ure" className="adgate-logo" />
        </div>

        {/* Headline */}
        <div className="adgate-headline-section">
          <h1 className="adgate-headline">{headline}</h1>
          {subheadline && <p className="adgate-subheadline">{subheadline}</p>}
        </div>

        {/* Sponsor card */}
        {campaign.sponsor_enabled && campaign.sponsor_name && (
          <div className="adgate-sponsor-card">
            <div className="adgate-sponsor-content">
              {campaign.sponsor_logo_url && (
                <img src={campaign.sponsor_logo_url} alt={campaign.sponsor_name} className="adgate-sponsor-logo" />
              )}
              <div className="adgate-sponsor-text">
                <h3 className="adgate-sponsor-name">{campaign.sponsor_name}</h3>
                {campaign.sponsor_tagline && (
                  <p className="adgate-sponsor-tagline">{campaign.sponsor_tagline}</p>
                )}
              </div>
            </div>
            {campaign.sponsor_cta_text && campaign.sponsor_cta_url && (
              <button onClick={handleSponsorClick} className="adgate-sponsor-cta">
                {campaign.sponsor_cta_text}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
            )}
          </div>
        )}

        {/* Video player */}
        <div className="adgate-video-section">
          <div className="adgate-video-wrapper">
            <video
              ref={videoRef}
              src={campaign.video_url}
              className="adgate-video"
              playsInline
              onPause={handlePause}
              onPlay={handlePlay}
              onSeeking={handleSeeking}
              preload="auto"
            />

            {/* Start overlay */}
            {state === "idle" && (
              <div className="adgate-video-overlay" onClick={startVideo}>
                <div className="adgate-play-btn">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="adgate-play-label">Start Video</p>
              </div>
            )}

            {/* Pause overlay */}
            {state === "paused" && !isComplete && (
              <div className="adgate-video-overlay adgate-video-overlay-paused" onClick={() => videoRef.current?.play()}>
                <div className="adgate-pause-message">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  <p>Video paused. Resume playback to continue.</p>
                </div>
              </div>
            )}

            {/* Tab hidden overlay */}
            {!isTabVisible && state === "playing" && (
              <div className="adgate-video-overlay adgate-video-overlay-paused">
                <div className="adgate-pause-message">
                  <p>Return to this tab to continue watching</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress section */}
          <div className="adgate-progress-section">
            <div className="adgate-progress-bar">
              <div
                className="adgate-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="adgate-progress-info">
              <span className="adgate-progress-timer">
                {isComplete ? (
                  <span className="adgate-complete-text">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Unlocking download...
                  </span>
                ) : state === "idle" ? (
                  `Watch for ${requiredDuration}s to unlock`
                ) : (
                  `${remaining}s remaining`
                )}
              </span>
              <span className="adgate-progress-pct">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Locked download preview */}
        <div className={`adgate-download-locked ${isComplete ? "adgate-download-unlocking" : ""}`}>
          <div className="adgate-lock-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div className="adgate-lock-info">
            <h3 className="adgate-lock-title">{link.resource_name}</h3>
            {link.editor_name && <p className="adgate-lock-editor">by {link.editor_name}</p>}
            {link.description && <p className="adgate-lock-desc">{link.description}</p>}
          </div>
          <div className="adgate-lock-badge">
            {isComplete ? "Unlocking..." : "Watch to unlock"}
          </div>
        </div>

        {/* Help text */}
        <p className="adgate-help-text">
          Trouble finishing the video? Reload the page or contact support.
        </p>

        {error && <p className="adgate-error">{error}</p>}

        {/* Footer */}
        <div className="adgate-footer">
          <span>© 6ure {new Date().getFullYear()}</span>
          <span>·</span>
          <a href="https://6ureleaks.com" target="_blank" rel="noopener">6ureleaks.com</a>
        </div>
      </div>
    </div>
  );
}
