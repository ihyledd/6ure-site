"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/requests-utils";
import { UserAvatar } from "@/components/requests/UserAvatar";



/* ─── Utils ────────────────────────────────────── */

/* ─── Types ────────────────────────────────────── */

type ResourceItem = {
  id: number;
  editor_name: string;
  name: string;
  file_path: string | null;
  thumbnail_url: string | null;
  place_url: string | null;
  download_count: number;
  view_count: number;
  is_premium: boolean | number;
  leaked_at: string | null;
  discord_member_id: string | null;
  discord_member_name: string | null;
  discord_member_avatar: string | null;
  editor_social_url: string | null;
  editor_avatar_url: string | null;
  editor_total_downloads: number;
  editor_resource_count: number;
  file_size_formatted: string;
  category: string | null;
};

type RelatedItem = {
  id: number;
  name: string;
  thumbnail_url: string | null;
  download_count: number;
  view_count: number;
  leaked_at: string;
  editor_name: string;
  editor_social_url: string | null;
  editor_avatar_url: string | null;
  is_premium: boolean;
  category: string | null;
};

type UserAccess = {
  isLoggedIn: boolean;
  isStaff: boolean;
  isPremium: boolean;
  isBooster: boolean;
  username: string | null;
  avatar: string | null;
};

/* ─── Component ────────────────────────────────── */
export function ResourceDetailClient({
  item,
  related,
  userAccess,
  isSimilar = false,
  discordUrl = "https://discord.gg/wFPsTezjeq"
}: {
  item: ResourceItem;
  related: RelatedItem[];
  userAccess: UserAccess;
  isSimilar?: boolean;
  discordUrl?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [dlCount, setDlCount] = useState(item.download_count);
  const [viewCount, setViewCount] = useState(item.view_count || 0);

  // Cooldown & Modal state
  const [cooldown, setCooldown] = useState(0);
  const [dlModal, setDlModal] = useState<{
    open: boolean;
    status: "generating" | "ready" | "error" | "login" | "premium" | "guild";
    url: string | null;
    passwordRequired: boolean;
    errorMsg: string | null;
  }>({ open: false, status: "generating", url: null, passwordRequired: false, errorMsg: null });

  const [timerSeconds, setTimerSeconds] = useState(3600);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const lastDl = localStorage.getItem("dl_cooldown");
    if (lastDl) {
      const elapsed = Math.floor((Date.now() - parseInt(lastDl, 10)) / 1000);
      if (elapsed < 15) {
        const remaining = 15 - elapsed;
        setCooldown(remaining);
        const cdInterval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cdInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  }, []);

  // Track view on mount
  useEffect(() => {
    fetch(`/api/resources/${item.id}/view`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setViewCount(prev => prev + 1);
        }
      })
      .catch(() => { });
  }, [item.id]);

  // Run the modal timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (dlModal.open && dlModal.status === "ready") {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dlModal.open, dlModal.status]);

  const closeDlModal = () => {
    setDlModal((m) => ({ ...m, open: false }));
  };

  const isPremium = item.is_premium === true || item.is_premium === 1;

  // Access check: premium resources require premium/staff/booster role
  const canDownload = !isPremium || userAccess.isStaff || userAccess.isPremium || userAccess.isBooster;

  async function handleDownload() {
    if (cooldown > 0) return;

    if (!userAccess.isLoggedIn) {
      setDlModal({ open: true, status: "login", url: null, passwordRequired: false, errorMsg: null });
      return;
    }

    if (isPremium && !canDownload) {
      setDlModal({ open: true, status: "premium", url: null, passwordRequired: false, errorMsg: null });
      return;
    }

    // Start 15s cooldown and save to localStorage
    setCooldown(15);
    localStorage.setItem("dl_cooldown", Date.now().toString());
    const cdInterval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cdInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Open modal in generating state
    setDlModal({ open: true, status: "generating", url: null, passwordRequired: false, errorMsg: null });
    setTimerSeconds(3600); // Reset timer

    try {
      const res = await fetch(`/api/resources/${item.id}/download`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        setDlModal({
          open: true,
          status: "ready",
          url: data.url,
          passwordRequired: data.password_required || false,
          errorMsg: null,
        });
      } else {
        const isGuildErr = data.error === "guild" || data.error?.toLowerCase().includes("discord server");

        setDlModal({
          open: true,
          status: isGuildErr ? "guild" : "error",
          url: null,
          passwordRequired: false,
          errorMsg: data.error || "Failed to generate download link.",
        });
      }
    } catch {
      setDlModal({
        open: true,
        status: "error",
        url: null,
        passwordRequired: false,
        errorMsg: "Network error. Please try again.",
      });
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="res-detail" style={{ maxWidth: 1140, margin: "0 auto", padding: "24px 24px 80px" }}>
      {/* Breadcrumb */}
      <Link href="/resources" className="res-detail-back">
        <i className="bi bi-arrow-left" /> Back to Resources
      </Link>

      {/* Two-column layout */}
      <div className="res-detail-layout">
        {/* ─── LEFT: Main content ─── */}
        <div className="res-detail-main">
          {/* Thumbnail */}
          <div className="res-detail-thumb loading-shimmer" style={{ position: "relative" }}>
            {/* Float Share Button */}
            <button
              onClick={handleShare}
              className="res-detail-thumb-share"
              title="Copy Link"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
              }}
            >
              <i className={`bi ${copied ? "bi-check-lg" : "bi-link-45deg"}`} style={{ fontSize: 18 }} />
            </button>
            {userAccess.isStaff && (
              <Link
                href={`/admin/resources?highlight=${(item as any).id}`}
                title="Manage resource (staff)"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 56,
                  height: 36,
                  paddingInline: 14,
                  borderRadius: 999,
                  background: "rgba(88,101,242,0.9)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  zIndex: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                }}
              >
                <i className="bi bi-pencil-square" /> Manage
              </Link>
            )}
            {item.thumbnail_url && !imgError ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                fill
                style={{ objectFit: "cover" }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="res-detail-thumb-placeholder">
                <i className="bi bi-box" />
              </div>
            )}
            {isPremium && (
              <span className="res-detail-premium-badge">
                <i className="bi bi-star-fill" /> Premium
              </span>
            )}
            <div className="res-detail-thumb-overlay" />
          </div>

          {/* Title + meta */}
          <h1 className="res-detail-title">{item.name}</h1>

          <div className="res-detail-meta-row">
            {/* Editor */}
            {item.editor_social_url ? (
              <a
                href={item.editor_social_url}
                target="_blank"
                rel="noopener noreferrer"
                className="res-detail-editor-chip"
              >
                <div className="anonymous-avatar" style={{ overflow: "hidden", background: "var(--bg-tertiary)" }}>
                  {item.editor_avatar_url ? (
                    <img src={item.editor_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{item.editor_name?.charAt(0).toUpperCase() || "?"}</span>
                  )}
                </div>
                <span>{item.editor_name}</span>
                <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }} />
              </a>
            ) : (
              <Link
                href={`/resources?editor=${encodeURIComponent(item.editor_name)}`}
                className="res-detail-editor-chip"
              >
                <div className="anonymous-avatar" style={{ overflow: "hidden", background: "var(--bg-tertiary)" }}>
                  {item.editor_avatar_url ? (
                    <img src={item.editor_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>{item.editor_name?.charAt(0).toUpperCase() || "?"}</span>
                  )}
                </div>
                <span>{item.editor_name}</span>
              </Link>
            )}



            {/* Type badge */}
            <span className={`res-detail-type-badge ${isPremium ? "premium" : "free"}`} style={!isPremium ? { background: "rgba(45, 199, 112, 0.1)", color: "#2dc770" } : {}}>
              {isPremium ? "⭐ Premium" : "Free"}
            </span>

            {/* Download count */}
            <span className="res-detail-stat-inline">
              <i className="bi bi-download" /> {dlCount.toLocaleString()} downloads
            </span>
          </div>

          {/* More from editor */}
          {related.length > 0 && (
            <div className="res-detail-related">
              <h3 className="res-detail-section-title">
                {isSimilar ? (
                  <>Similar <span style={{ color: "var(--discord-blurple)" }}>Resources</span></>
                ) : (
                  <>More from <span style={{ color: "var(--discord-blurple)" }}>{item.editor_name}</span></>
                )}
              </h3>
              <div className="res-detail-related-grid">
                {related.map((r) => (
                  <RelatedCard key={r.id} r={r} />
                ))}
              </div>
            </div>
          )}

          <ResourceComments resourceId={Number((item as any).id)} userAccess={userAccess} />
        </div>

        <aside className="res-detail-sidebar">


          {/* Download section */}
          <div className="res-detail-card">
            <div className="res-detail-card-section">
              <div className="res-detail-card-label">Download</div>
              <button
                className="res-detail-download-btn"
                onClick={handleDownload}
                disabled={cooldown > 0 || !item.file_path}
              >
                {cooldown > 0 ? (
                  <>
                    <i className="bi bi-clock-history" />
                    Wait {cooldown}s
                  </>
                ) : isPremium && !canDownload ? (
                  <>
                    <i className="bi bi-lock-fill" />
                    Premium Only
                  </>
                ) : (
                  <>
                    <i className="bi bi-download" />
                    Download Now
                  </>
                )}
              </button>
              {!item.file_path && (
                <p className="res-detail-note">File not available yet.</p>
              )}
              {isPremium && !canDownload && (
                <p className="res-detail-premium-note">
                  <i className="bi bi-info-circle" /> Requires <strong>Premium</strong>, <strong>Staff</strong>, or <strong>Server Booster</strong> role.
                </p>
              )}
              <div className="res-detail-dl-count">
                <i className="bi bi-download" /> {dlCount.toLocaleString()} downloads
              </div>
            </div>
          </div>

          {/* Uploaded by */}
          {(item.discord_member_name || item.discord_member_id) && (
            <div className="res-detail-card">
              <div className="res-detail-card-section">
                <div className="res-detail-card-label">Uploaded By</div>
                <div className="res-detail-uploader">
                  {item.discord_member_id ? (
                    <img
                      src={`/api/discord-avatar/${item.discord_member_id}`}
                      alt=""
                      className="res-detail-uploader-avatar"
                      loading="lazy"
                    />
                  ) : (
                    <div className="anonymous-avatar">
                      <span>?</span>
                    </div>
                  )}
                  <span className="res-detail-uploader-name">
                    {item.discord_member_name || "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="res-detail-card">
            <div className="res-detail-card-section">
              <div className="res-detail-card-label">Details</div>
              <div className="res-detail-info-list">
                <div className="res-detail-info-row">
                  <span className="res-detail-info-key"><i className="bi bi-calendar3" /> Date</span>
                  <span className="res-detail-info-value" suppressHydrationWarning>{formatDate(item.leaked_at, "long")}</span>
                </div>
                <div className="res-detail-info-row">
                  <span className="res-detail-info-key"><i className="bi bi-hdd" /> Size</span>
                  <span className="res-detail-info-value">{item.file_size_formatted}</span>
                </div>
                {item.place_url && (
                  <div className="res-detail-info-row">
                    <span className="res-detail-info-key"><i className="bi bi-link-45deg" /> Product Link</span>
                    <a
                      href={item.place_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="res-detail-info-value"
                      style={{ color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      View <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
                    </a>
                  </div>
                )}
                {item.editor_resource_count > 0 && (
                  <div className="res-detail-info-row">
                    <span className="res-detail-info-key"><i className="bi bi-collection" /> Resources</span>
                    <span className="res-detail-info-value">{item.editor_resource_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Discreet Legal Footer */}
      <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", opacity: 0.5, fontSize: 12, textAlign: "center", maxWidth: 800, margin: "64px auto 0" }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          If you believe this content infringes your rights, please contact us through our{" "}
          <Link href="/dmca" style={{ color: "inherit", textDecoration: "underline" }}>legal process</Link>{" "}
          for review and removal. For additional protection, consider our{" "}
          <Link href="/membership" style={{ color: "inherit", textDecoration: "underline" }}>Leak Protection</Link>{" "}
          membership.
        </p>
      </div>

      {/* ─── Download Manager Modal ─── */}
      {dlModal.open && (
        <div className="dl-modal-overlay" onClick={closeDlModal}>
          <div className="dl-modal" onClick={(e) => e.stopPropagation()}>
            {dlModal.status === "login" && (
              <div className="dl-modal-content">
                <i className="bi bi-box-arrow-in-right dl-modal-icon-big" style={{ color: "var(--text-secondary)" }} />
                <h2 className="dl-modal-title">Login Required</h2>
                <p className="dl-modal-desc">Please log in with Discord to download resources.</p>
                <div className="dl-modal-actions">
                  <button className="dl-modal-btn-primary" onClick={closeDlModal}>Close</button>
                </div>
              </div>
            )}

            {dlModal.status === "premium" && (
              <div className="dl-modal-content">
                <i className="bi bi-lock-fill dl-modal-icon-big" style={{ color: "#facc15" }} />
                <h2 className="dl-modal-title">Premium Resource</h2>
                <p className="dl-modal-desc">⭐ This is a premium resource. You need a Premium, Staff, or Booster role to download.</p>
                <div className="dl-modal-actions">
                  <button className="dl-modal-btn-primary" onClick={closeDlModal}>Close</button>
                </div>
              </div>
            )}

            {dlModal.status === "guild" && (
              <div className="dl-modal-content">
                <i className="bi bi-discord dl-modal-icon-big" style={{ color: "var(--discord-blurple)" }} />
                <h2 className="dl-modal-title">Verification Required</h2>
                <p className="dl-modal-desc">You must be a <b>verified member</b> of our official Discord server to download resources. This helps us prevent abuse and stay connected with our community.</p>
                <p className="dl-modal-desc" style={{ marginTop: 8, fontSize: 13, color: "var(--text-tertiary)" }}>
                  <i className="bi bi-info-circle" /> If you just got verified, please <b>refresh this page</b> so the website picks up your new role.
                </p>

                <div className="dl-modal-actions" style={{ flexDirection: 'column', gap: 10 }}>
                  <button
                    className="dl-modal-btn-download"
                    style={{ width: '100%', background: 'var(--discord-blurple)' }}
                    onClick={() => window.open(discordUrl, "_blank")}
                  >
                    <i className="bi bi-discord" /> Join Discord Server
                  </button>
                  <button
                    className="dl-modal-btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => window.location.reload()}
                  >
                    <i className="bi bi-arrow-clockwise" /> Refresh page
                  </button>
                  <button className="dl-modal-btn-secondary" style={{ width: '100%' }} onClick={closeDlModal}>Close</button>
                </div>
              </div>
            )}

            {dlModal.status === "error" && (
              <div className="dl-modal-content">
                <i className="bi bi-exclamation-triangle-fill dl-modal-icon-big" style={{ color: "#ef4444" }} />
                <h2 className="dl-modal-title">Download Failed</h2>
                <p className="dl-modal-desc">{dlModal.errorMsg}</p>
                <div className="dl-modal-actions">
                  <button className="dl-modal-btn-primary" onClick={closeDlModal}>Close</button>
                </div>
              </div>
            )}

            {dlModal.status === "generating" && (
              <div className="dl-modal-content">
                <div className="dl-modal-spinner" />
                <h2 className="dl-modal-title">Generating Secure Link...</h2>
                <p className="dl-modal-desc">Communicating with the cloud server to prepare your download manager.</p>
              </div>
            )}

            {dlModal.status === "ready" && (
              <div className="dl-modal-content">
                <i className="bi bi-cloud-arrow-down dl-modal-icon-big" style={{ color: "var(--discord-blurple)" }} />
                <h2 className="dl-modal-title">{item.name}</h2>
                <p className="dl-modal-subtitle">Download Manager Ready</p>

                <div className="dl-modal-badges">
                  <div className="dl-modal-badge timer">
                    <i className="bi bi-clock-history" />
                    {Math.floor(timerSeconds / 3600)}h {Math.floor((timerSeconds % 3600) / 60)}m {timerSeconds % 60}s
                  </div>
                  {dlModal.passwordRequired ? (
                    <div className="dl-modal-badge encrypted">
                      <i className="bi bi-shield-lock" /> Password Protected
                    </div>
                  ) : (
                    <div className="dl-modal-badge decrypted">
                      <i className="bi bi-shield-check" /> Direct Access
                    </div>
                  )}
                  <div className="dl-modal-badge single-use">
                    <i className="bi bi-1-circle" /> Single Use
                  </div>
                </div>

                {dlModal.passwordRequired && (
                  <div className="dl-modal-password-hint">
                    <i className="bi bi-info-circle-fill" />
                    <span>
                      You will need a password to access this file. Get it at: <strong>6ureleaks.com/password</strong>
                    </span>
                  </div>
                )}

                <div className="dl-modal-actions">
                  <button className="dl-modal-btn-secondary" onClick={closeDlModal}>
                    Cancel
                  </button>
                  <button
                    className="dl-modal-btn-download"
                    onClick={() => {
                      if (dlModal.url) {
                        window.open(dlModal.url, "_blank");
                        setDlCount((c) => c + 1);
                        closeDlModal();
                      }
                    }}
                  >
                    <i className="bi bi-download" /> Download File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RelatedCard({ r }: { r: RelatedItem }) {
  const [error, setError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const getAvatarSrc = () => {
    if (!r.editor_social_url) return null;
    const url = r.editor_social_url;
    if (url.match(/\.(jpeg|jpg|gif|png|webp|avif)/i)) return url;
    try {
      const domainMatch = url.match(/(instagram|tiktok|twitter|x|github|youtube|twitch)\.com/i);
      const platform = domainMatch ? domainMatch[1].toLowerCase() : "";
      const username = url.split("/").filter(Boolean).pop()?.replace("@", "");
      if (platform && username) return `https://unavatar.io/${platform}/${username}`;
      return `https://unavatar.io/${url.replace(/https?:\/\/(www\.)?/, "")}`;
    } catch { return null; }
  };

  const avatarSrc = getAvatarSrc();

  return (
    <Link href={`/resources/${r.id}`} className={`request-card ${r.is_premium ? "premium" : ""}`}>
      {r.thumbnail_url && !error ? (
        <div className="request-image-wrapper loading-shimmer">
          <div className="request-image">
            <Image
              src={r.thumbnail_url}
              alt={r.name}
              fill
              style={{ objectFit: "cover" }}
              sizes="200px"
              onError={() => setError(true)}
            />
            <div className="image-overlay" />
          </div>
        </div>
      ) : (
        <div className="request-image-placeholder">
          <div className="placeholder-icon">📦</div>
        </div>
      )}
      <div className="request-content" style={{ padding: "12px 14px" }}>
        <div className="request-tags" style={{ marginBottom: 6 }}>
          {r.category && (
            <span className="request-tag" style={{ "--tag-color": "var(--discord-blurple)", padding: "2px 6px", fontSize: 10 } as React.CSSProperties}>
              <img
                src={`https://images.6ureleaks.com/logos/${r.category === "Adobe After Effects" ? "ae.png" :
                  r.category === "Adobe Premiere Pro" ? "pr.png" :
                    r.category === "Adobe Photoshop" ? "ps.png" :
                      r.category === "Alight Motion" ? "am.png" :
                        r.category === "CapCut" ? "cc.png" :
                          r.category === "Sony Vegas Pro" ? "sv.png" :
                            r.category === "Davinci Resolve" ? "dr.png" :
                              r.category === "Video Star" ? "vs.png" :
                                r.category === "Topaz Labs" ? "tl.png" : ""
                  }`}
                alt=""
                style={{ width: 12, height: 12, borderRadius: 2, objectFit: "contain" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <span>{r.category}</span>
            </span>
          )}
          {r.is_premium ? (
            <span className="request-tag" style={{ "--tag-color": "#fbbf24", padding: "2px 6px", fontSize: 10 } as React.CSSProperties}>
              <i className="bi bi-star-fill" style={{ fontSize: 10 }} />
              <span>Premium</span>
            </span>
          ) : (
            <span className="request-tag" style={{ "--tag-color": "#2dc770", padding: "2px 6px", fontSize: 10 } as React.CSSProperties}>
              <span>Free</span>
            </span>
          )}
        </div>
        <h3 className="request-title" style={{ fontSize: 13 }}>{r.name}</h3>

        <div className="request-footer" style={{ padding: 0, background: "none", border: "none", marginTop: 10 }}>
          {/* Row 1: Date */}
          <div className="request-meta-row" style={{ fontSize: 10 }}>
            <span className="request-date" suppressHydrationWarning style={{ marginLeft: 0 }}>{formatDate(r.leaked_at)}</span>
          </div>

          {/* Row 2: Creator Button */}
          <div className="request-links-row" style={{ marginTop: 8 }}>
            <div
              className="request-link-btn request-creator-link"
              style={{ flex: 1, justifyContent: "flex-start", gap: 6, cursor: "default", padding: "4px 8px", fontSize: 11 }}
              onClick={(e) => {
                if (r.editor_social_url) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(r.editor_social_url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <div className="author-avatar" style={{
                width: 18, height: 18, borderRadius: "50%", overflow: "hidden",
                background: "var(--bg-tertiary)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff",
                flexShrink: 0
              }}>
                {r.editor_avatar_url ? (
                  <img src={r.editor_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{r.editor_name?.charAt(0).toUpperCase() || "?"}</span>
                )}
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.editor_name || "Unknown"}
              </span>
              {r.editor_social_url && <i className="bi bi-box-arrow-up-right" style={{ fontSize: 9, opacity: 0.6 }} />}
            </div>
          </div>

          {/* Row 3: Stats */}
          <div className="request-actions" style={{ marginTop: 8 }}>
            <span className="btn-upvote" style={{ cursor: "default", fontSize: 11, padding: "2px 6px" }}>
              <i className="bi bi-download" style={{ fontSize: 11 }} />
              <span>{r.download_count || 0}</span>
            </span>
            <div className="request-views" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--discord-blurple)", fontWeight: 600, fontSize: 11 }}>
              <span>View</span>
              <i className="bi bi-arrow-right" style={{ fontSize: 11 }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

type ResourceCommentRow = {
  id: number;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  body: string;
  created_at: string;
  is_pinned: number | boolean;
  is_staff_reply: number | boolean;
  db_avatar?: string | null;
  db_display_name?: string | null;
};

function ResourceComments({ resourceId, userAccess }: {
  resourceId: number;
  userAccess: { isLoggedIn: boolean; isStaff: boolean; username: string | null; avatar: string | null };
}) {
  const [items, setItems] = useState<ResourceCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [resourceId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setBody("");
      load();
    } catch (e: any) {
      setError(e?.message || "Could not post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/resources/comments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="res-detail-comments" style={{ marginTop: 32 }}>
      <h3 className="res-detail-section-title">
        <i className="bi bi-chat-left-text" /> Comments
        {items.length > 0 && <span style={{ color: "var(--text-secondary)", fontWeight: 500, marginLeft: 8 }}>({items.length})</span>}
      </h3>

      {userAccess.isLoggedIn ? (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts about this resource..."
            maxLength={2000}
            rows={3}
            style={{
              padding: "10px 12px", borderRadius: 10,
              background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
              color: "inherit", fontSize: 14, outline: "none", resize: "vertical",
            }}
          />
          {error && <div style={{ color: "#ed4245", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{body.length} / 2000</span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="dash-btn dash-btn-primary"
              style={{ padding: "8px 18px" }}
            >
              {submitting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", fontSize: 13, color: "var(--text-secondary)" }}>
          <Link href="/" style={{ color: "var(--discord-blurple)" }}>Sign in</Link> to leave a comment.
        </div>
      )}

      {loading ? (
        <div style={{ padding: 16, color: "var(--text-secondary)" }}>Loading comments…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
          <i className="bi bi-chat-dots" style={{ fontSize: 24, opacity: 0.4 }} />
          <div style={{ marginTop: 8 }}>No comments yet — be the first.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map(c => {
            const displayName = c.user_name || c.db_display_name || "User";
            const avatar = c.user_avatar || c.db_avatar || null;
            return (
              <div key={c.id} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                <UserAvatar userId={c.user_id} avatar={avatar} displayName={displayName} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{displayName}</strong>
                    {c.is_staff_reply ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "rgba(88,101,242,0.15)", color: "#949cf7" }}>STAFF</span>
                    ) : null}
                    {c.is_pinned ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "rgba(250, 166, 26, 0.15)", color: "#faa61a" }}>
                        <i className="bi bi-pin-angle-fill" /> PINNED
                      </span>
                    ) : null}
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: "auto" }} suppressHydrationWarning>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {c.body}
                  </div>
                  {(userAccess.isStaff || c.user_id === (userAccess as any).userId) && (
                    <button
                      onClick={() => remove(c.id)}
                      style={{ marginTop: 6, background: "none", border: "none", color: "#ed4245", cursor: "pointer", fontSize: 11 }}
                    >
                      <i className="bi bi-trash" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
