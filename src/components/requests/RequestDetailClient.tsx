"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { CreatorAvatar } from "./CreatorAvatar";
import { BiIcon } from "./BiIcon";
import { UserAvatar } from "./UserAvatar";
import { Comments } from "./Comments";
import { CancelRequestModal } from "./CancelRequestModal";
import { DeleteRequestModal } from "./DeleteRequestModal";
import { MarkdownProse } from "@/components/Markdown";
import {
  formatDate,
  getRequestImageUrl,
  buildRequestTitle,
} from "@/lib/requests-utils";
import type { RequestData } from "@/lib/db-types";

function getPriceColor(priceStr: string | null): { color: string; bg: string; border: string } {
  if (!priceStr) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num < 10) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
  if (num < 20) return { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.25)" };
  if (num < 50) return { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.25)" };
  return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)" };
}

type Props = {
  initialRequest: RequestData;
};

function getStatusConfig(status: string) {
  switch (status) {
    case "pending": return { icon: "clock", label: "Pending", color: "#f59e0b", pulse: true };
    case "completed": return { icon: "check-circle-fill", label: "Available", color: "#10b981", pulse: false };
    case "rejected": return { icon: "x-circle-fill", label: "Rejected", color: "#ef4444", pulse: false };
    case "cancelled": return { icon: "slash-circle", label: "Cancelled", color: "#6b7280", pulse: false };
    default: return { icon: "circle", label: status.toUpperCase(), color: "#5865f2", pulse: false };
  }
}

function getStatusBannerConfig(status: string) {
  switch (status) {
    case "pending": return { icon: "hourglass-split", message: "This request is pending review by our team.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)" };
    case "completed": return { icon: "check-circle-fill", message: "This request has been fulfilled and is now available.", color: "#10b981", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)" };
    case "rejected": return { icon: "x-circle-fill", message: "This request has been rejected.", color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" };
    case "cancelled": return { icon: "slash-circle", message: "This request has been cancelled.", color: "#6b7280", bg: "rgba(107, 114, 128, 0.08)", border: "rgba(107, 114, 128, 0.2)" };
    default: return null;
  }
}

function getShareLinks(url: string, title: string) {
  const enc = encodeURIComponent;
  return [
    { name: "WhatsApp", icon: "whatsapp", href: `https://wa.me/?text=${enc(title + " " + url)}`, color: "#25D366" },
    { name: "X (Twitter)", icon: "twitter-x", href: `https://x.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, color: "#fff" },
    { name: "LinkedIn", icon: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, color: "#0A66C2" },
    { name: "Telegram", icon: "telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`, color: "#26A5E4" },
  ];
}

/* Animated counter hook: counts from 0 to target when visible */
function useAnimatedCounter(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (!ref.current || animated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setCount(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function AnimatedStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div className="stat-item">
      <BiIcon name={icon} size={18} />
      <span ref={ref}>{count} {label}</span>
    </div>
  );
}

export function RequestDetailClient({ initialRequest }: Props) {
  const [request, setRequest] = useState<RequestData & { hasUpvoted?: boolean }>(initialRequest);
  const [upvoting, setUpvoting] = useState(false);
  const [showStaffBadge, setShowStaffBadge] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [loginHref, setLoginHref] = useState(
    `/api/auth/signin/discord?callbackUrl=${encodeURIComponent("/requests")}`
  );

  const [showUpvoters, setShowUpvoters] = useState(false);
  const [upvotersLoading, setUpvotersLoading] = useState(false);
  const [upvoters, setUpvoters] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoginHref(`/api/auth/signin/discord?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
  }, []);

  useEffect(() => {
    fetch("/api/site-settings/requests-display")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { staff_badge_visible?: string }) => {
        setShowStaffBadge((d?.staff_badge_visible ?? "false") === "true");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/requests/${request.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setRequest(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request.id]);

  useEffect(() => {
    let active = true;
    if (showUpvoters && upvoters.length === 0) {
      setUpvotersLoading(true);
      fetch(`/api/requests/${request.id}/upvoters`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (active) {
            setUpvoters(Array.isArray(data.upvoters) ? data.upvoters : Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setUpvotersLoading(false);
        });
    }
    return () => { active = false; };
  }, [showUpvoters, request.id, upvoters.length]);

  const { data: session } = useSession();
  const canUpvote = !!session?.user;
  const isOwner = !!session?.user?.id && request.user_id === session.user.id;
  const isAdmin = session?.user?.role === "ADMIN";
  const canRequestCancel =
    isOwner &&
    request.status === "pending" &&
    !request.cancel_requested_at;
  const title = buildRequestTitle(request);
  const imgUrl = getRequestImageUrl(request.image_url) ?? request.image_url;
  const statusConfig = getStatusConfig(request.status);
  const isAnonymous = request.anonymous || request.username === "Anonymous";
  const isPriority = request.has_priority && request.status !== "completed";
  const isCompleted = request.status === "completed";
  const [upvoteAnimating, setUpvoteAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const statusBanner = getStatusBannerConfig(request.status);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareLinks = getShareLinks(pageUrl, title);

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showShareMenu]);

  const handleUpvote = async () => {
    if (!canUpvote || upvoting) return;
    setUpvoting(true);
    try {
      const res = await fetch(`/api/upvotes/${request.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.upvoted !== undefined) {
        setRequest((prev) => ({
          ...prev,
          hasUpvoted: data.upvoted,
          upvotes: Number(data.upvotes ?? prev.upvotes),
        }));
      }
    } finally {
      setUpvoting(false);
    }
  };

  const handleUpvoteWithAnimation = useCallback(async () => {
    if (!canUpvote || upvoting) return;
    const wasUpvoted = request.hasUpvoted;
    await handleUpvote();
    if (!wasUpvoted) {
      setUpvoteAnimating(true);
      setTimeout(() => setUpvoteAnimating(false), 800);
    }
  }, [canUpvote, upvoting, request.hasUpvoted]);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardClass = clsx("request-detail-card", {
    premium: request.patreon_premium,
    priority: isPriority,
    completed: isCompleted,
    cancelled: request.status === "cancelled",
  });

  return (
    <div className="request-detail-container">
      <Link href="/requests" className="btn-back-top">
        <BiIcon name="arrow-left" size={16} /> Back to Requests
      </Link>

      <article className={cardClass}>
        {/* Hero image with hover zoom */}
        {imgUrl ? (
          <div className={clsx("detail-image-wrapper", imageLoaded && "loaded")}>
            <div className="detail-image detail-image-zoom">
              <img
                src={imgUrl}
                alt=""
                onLoad={() => setImageLoaded(true)}
                className={clsx(imageLoaded && "img-loaded")}
              />
            </div>
            {isCompleted && (
              <span className="completed-badge-large completed-badge-animated">
                <BiIcon name="check-circle-fill" size={18} />
                <span>Available</span>
              </span>
            )}
            {isPriority && (
              <span className="priority-badge-hero">
                <BiIcon name="star-fill" size={14} />
                <span>Priority</span>
              </span>
            )}
            {/* Status badge — top left */}
            <span
              className={clsx("detail-image-status-tag", statusConfig.pulse && "detail-tag-pulse")}
              style={{ "--tag-color": statusConfig.color } as React.CSSProperties}
            >
              {statusConfig.pulse ? (
                <span className="status-dot-animated" style={{ "--dot-color": statusConfig.color } as React.CSSProperties} />
              ) : (
                <BiIcon name={statusConfig.icon} size={14} />
              )}
              <span>{statusConfig.label}</span>
            </span>
            {/* Title + price overlay — bottom */}
            <div className="detail-image-title-overlay">
              <h1 className="detail-image-title">{title}</h1>
              {request.price && (
                <span
                  className="detail-image-price"
                  style={{
                    "--price-color": getPriceColor(request.price).color,
                    "--price-bg": getPriceColor(request.price).bg,
                    "--price-border": getPriceColor(request.price).border,
                  } as React.CSSProperties}
                >
                  {request.price}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="detail-image-placeholder">
            <div className="placeholder-icon-large">📦</div>
          </div>
        )}

        {/* Content */}
        <div className="detail-content">
          {/* Status banner — full-width colored banner */}
          {statusBanner && (
            <div
              className="detail-status-banner"
              style={{
                "--banner-color": statusBanner.color,
                "--banner-bg": statusBanner.bg,
                "--banner-border": statusBanner.border,
              } as React.CSSProperties}
            >
              <BiIcon name={statusBanner.icon} size={18} />
              <span>{statusBanner.message}</span>
            </div>
          )}

          {/* Compact author line — avatar + name + time ago */}
          <div className="detail-author-line">
            <div className="detail-author-line-left">
              {!isAnonymous && request.user_id ? (
                <>
                  <UserAvatar
                    avatar={request.avatar}
                    userId={request.user_id}
                    avatarDecoration={request.avatar_decoration}
                    size={28}
                    displayName={request.username}
                  />
                  <span className="detail-author-name">{request.username}</span>
                </>
              ) : (
                <>
                  <div className="detail-author-anon">?</div>
                  <span className="detail-author-name anonymous">Anonymous</span>
                </>
              )}
              {request.patreon_premium && <span className="premium-tag-sm">⭐</span>}
              <span className="detail-author-sep">·</span>
              <span className="detail-author-time">{formatDate(request.created_at)}</span>
            </div>
          </div>

          {/* Inline stats bar — upvotes | comments | views | price | share */}
          <div className="detail-stats-bar">
            <div className="detail-stats-bar-left">
              {canUpvote ? (
                <button
                  type="button"
                  className={`stat-chip stat-chip-upvote ${request.hasUpvoted ? 'upvoted' : ''} ${upvoteAnimating ? 'upvote-bounce' : ''}`}
                  onClick={handleUpvoteWithAnimation}
                  disabled={upvoting}
                  title={request.hasUpvoted ? 'Remove upvote' : 'Upvote this request'}
                >
                  <BiIcon name={request.hasUpvoted ? 'hand-thumbs-up-fill' : 'hand-thumbs-up'} size={14} />
                  <span>{Number(request.upvotes) || 0}</span>
                </button>
              ) : (
                <a href={loginHref} className="stat-chip stat-chip-upvote" title="Sign in to upvote">
                  <BiIcon name="hand-thumbs-up" size={14} />
                  <span>{Number(request.upvotes) || 0}</span>
                </a>
              )}
              <span className="stat-chip stat-chip-plain">
                <BiIcon name="chat-dots" size={14} />
                <span>{Number(request.comments_count) || 0}</span>
              </span>
              <span className="stat-chip stat-chip-plain">
                <BiIcon name="eye" size={14} />
                <span>{Number(request.views) || 0}</span>
              </span>
              {request.price && (
                <span
                  className="stat-chip stat-chip-price"
                  style={{
                    "--price-color": getPriceColor(request.price).color,
                    "--price-bg": getPriceColor(request.price).bg,
                    "--price-border": getPriceColor(request.price).border,
                  } as React.CSSProperties}
                >
                  <BiIcon name="tag" size={14} />
                  <span>{request.price}</span>
                </span>
              )}
            </div>
            <div className="detail-stats-bar-right" ref={shareRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="stat-share-btn"
                onClick={() => setShowShareMenu((v: boolean) => !v)}
                title="Share"
              >
                <BiIcon name="share" size={18} />
              </button>
              {showShareMenu && typeof document !== "undefined" && createPortal(
                <div
                  className="share-dropdown share-dropdown-stats"
                  style={{
                    position: "fixed",
                    top: (() => {
                      const rect = shareRef.current?.getBoundingClientRect();
                      return rect ? rect.bottom + 8 : 0;
                    })(),
                    right: (() => {
                      const rect = shareRef.current?.getBoundingClientRect();
                      return rect ? window.innerWidth - rect.right : 0;
                    })(),
                    left: "auto",
                  }}
                >
                  <button
                    type="button"
                    className="share-dropdown-item share-dropdown-copy"
                    onClick={() => {
                      navigator.clipboard?.writeText(pageUrl);
                      setCopied(true);
                      setTimeout(() => { setCopied(false); setShowShareMenu(false); }, 1500);
                    }}
                  >
                    <BiIcon name={copied ? "check-lg" : "clipboard"} size={18} />
                    <span>{copied ? "Copied!" : "Copy link"}</span>
                  </button>
                  {shareLinks.map(link => (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="share-dropdown-item"
                    >
                      <BiIcon name={link.icon} size={18} style={{ color: link.color }} />
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Unified Resource Card — Creator / Product / Download */}
          <div className="detail-resource-card">
            {/* Creator row */}
            {request.creator_url && (
              <a
                href={request.creator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card-row resource-card-row-creator"
              >
                <div className="resource-card-icon">
                  {request.creator_avatar ? (
                    <img
                      src={request.creator_avatar}
                      alt=""
                      className="resource-card-avatar"
                    />
                  ) : (
                    <BiIcon name="person-circle" size={32} />
                  )}
                </div>
                <div className="resource-card-text">
                  <span className="resource-card-label">CREATOR</span>
                  <span className="resource-card-value">
                    @{request.creator_name || "Unknown"}
                    {request.creator_platform && (
                      <span className="resource-card-platform">{request.creator_platform}</span>
                    )}
                  </span>
                </div>
              </a>
            )}

            {/* Product row */}
            {request.product_url && (
              <a
                href={request.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card-row"
              >
                <div className="resource-card-icon">
                  <BiIcon name="gift" size={24} />
                </div>
                <div className="resource-card-text">
                  <span className="resource-card-label">PRODUCT</span>
                  <span className="resource-card-value">View original product</span>
                </div>
              </a>
            )}

            {/* Download row */}
            {request.leak_message_url && (
              <a
                href={request.leak_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card-row"
              >
                <div className="resource-card-icon resource-card-icon-discord">
                  <BiIcon name="discord" size={24} />
                </div>
                <div className="resource-card-text">
                  <span className="resource-card-label">DOWNLOAD</span>
                  <span className="resource-card-value">Available in Discord</span>
                </div>
              </a>
            )}
          </div>


          {/* Description */}
          {request.description && (
            <div className="detail-description-section">
              <h3>About this request</h3>
              <MarkdownProse content={request.description} className="detail-description" />
            </div>
          )}



          {/* Large leak button */}
          {request.leak_message_url && (
            <div className="leak-access-section">
              <a
                href={request.leak_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-leak-large"
              >
                <BiIcon name="discord" size={22} />
                Download in Discord
              </a>
            </div>
          )}

          {/* Admin actions: Upvoters + Delete */}
          {isAdmin && (
            <div className="detail-actions">
              <button
                type="button"
                className="btn-upvoters-action"
                onClick={() => setShowUpvoters((v) => !v)}
                aria-expanded={showUpvoters}
              >
                <BiIcon name="people" size={16} />
                Upvoters ({request.upvotes})
              </button>
              <button
                type="button"
                className="btn-delete-request"
                onClick={() => setShowDeleteModal(true)}
              >
                <BiIcon name="trash" size={16} />
                Delete
              </button>
            </div>
          )}

          {/* Upvoters dropdown (admin) */}
          {isAdmin && showUpvoters && (
            <div className="upvoters-dropdown-panel">
              {upvotersLoading ? (
                <div className="upvoters-loading">
                  <div className="upvoters-spinner" />
                  <span>Loading upvoters…</span>
                </div>
              ) : upvoters.length === 0 ? (
                <p className="upvoters-empty">No upvoters yet.</p>
              ) : (
                <ul className="upvoters-list">
                  {upvoters.map((user) => (
                    <li key={user.user_id} className="upvoter-item">
                      <UserAvatar
                        avatar={user.avatar}
                        userId={user.user_id}
                        avatarDecoration={user.avatar_decoration}
                        size={28}
                        displayName={user.username}
                      />
                      <div className="upvoter-info">
                        <a
                          href={`https://discord.com/users/${user.user_id}`}
                          className="upvoter-name-link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {user.username}
                        </a>
                        <span className="upvoter-time">
                          {user.created_at ? formatDate(user.created_at) : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Cancel request */}
          {canRequestCancel && (
            <div className="detail-cancel-request-section">
              <button
                type="button"
                className="btn-cancel-request"
                onClick={() => setShowCancelModal(true)}
              >
                <BiIcon name="x-circle" size={16} />
                <span>Request cancellation</span>
              </button>
            </div>
          )}

          {request.cancel_requested_at && (
            <div className="detail-cancel-request-section">
              <span className="detail-tag" style={{ "--tag-color": "#6b7280" } as React.CSSProperties}>
                <BiIcon name="slash-circle" size={14} />
                <span>Cancellation requested</span>
              </span>
            </div>
          )}
        </div>
      </article>

      {showCancelModal &&
        typeof document !== "undefined" &&
        createPortal(
          <CancelRequestModal
            requestId={request.id}
            onClose={() => setShowCancelModal(false)}
            onSubmitted={() => {
              fetch(`/api/requests/${request.id}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => data && setRequest(data))
                .catch(() => {});
            }}
          />,
          document.body
        )}

      {showDeleteModal &&
        typeof document !== "undefined" &&
        createPortal(
          <DeleteRequestModal
            requestId={request.id}
            requestTitle={title}
            onClose={() => setShowDeleteModal(false)}
            onDeleted={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/requests";
              }
            }}
          />,
          document.body
        )}

      <section className="comments-section">
        <Comments
          requestId={request.id}
          commentsLocked={request.comments_locked}
          loginHref={loginHref}
          showStaffBadge={showStaffBadge}
        />
      </section>
    </div>
  );
}
