"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { CreatorAvatar } from "./CreatorAvatar";
import { BiIcon } from "./BiIcon";
import { UserAvatar } from "./UserAvatar";
import { Comments } from "./Comments";
import { CancelRequestModal } from "./CancelRequestModal";
import { MarkdownProse } from "@/components/Markdown";
import {
  formatDate,
  getRequestImageUrl,
  buildRequestTitle,
} from "@/lib/requests-utils";
import type { RequestData } from "@/lib/db-types";

type Props = {
  initialRequest: RequestData;
};

const STATUS_MESSAGES: Record<string, string> = {
  completed: "This request has been fulfilled and is now available.",
  rejected: "This request has been rejected.",
  cancelled: "This request has been cancelled.",
};

export function RequestDetailClient({ initialRequest }: Props) {
  const [request, setRequest] = useState<RequestData & { hasUpvoted?: boolean }>(initialRequest);
  const [upvoting, setUpvoting] = useState(false);
  const [showStaffBadge, setShowStaffBadge] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loginHref, setLoginHref] = useState(
    `/api/auth/signin/discord?callbackUrl=${encodeURIComponent("/requests")}`
  );

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

  const { data: session } = useSession();
  const canUpvote = !!session?.user;
  const isOwner = !!session?.user?.id && request.user_id === session.user.id;
  const canRequestCancel =
    isOwner &&
    request.status === "pending" &&
    !request.cancel_requested_at;
  const title = buildRequestTitle(request);
  const imgUrl = getRequestImageUrl(request.image_url) ?? request.image_url;
  const statusMsg = STATUS_MESSAGES[request.status];

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

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardClass = clsx("request-detail-card", {
    premium: request.patreon_premium,
    priority: request.has_priority,
    completed: request.status === "completed",
    cancelled: request.status === "cancelled",
  });

  return (
    <div className="request-detail-container">
      <Link href="/requests" className="requests-back-link">
        ← Back to Requests
      </Link>

      <article className={cardClass}>
        {/* Hero image area */}
        {imgUrl ? (
          <div className="detail-image-wrapper">
            <img src={imgUrl} alt="" className="detail-image" />
            <div className="detail-hero-overlay">
              <span className={clsx("requests-tag", "requests-tag-status", `requests-tag-${request.status}`)}>
                {request.status.toUpperCase()}
              </span>
              <h1 className="detail-title">{title}</h1>
            </div>
          </div>
        ) : (
          <div className="detail-image-placeholder">
            <div className="detail-hero-overlay">
              <span className={clsx("requests-tag", "requests-tag-status", `requests-tag-${request.status}`)}>
                {request.status.toUpperCase()}
              </span>
              <h1 className="detail-title">{title}</h1>
            </div>
            <BiIcon name="image" size={48} />
          </div>
        )}

        {/* Content area (overlaps hero) */}
        <div className="detail-content">
          {/* User + date */}
          <div className="detail-requested-by-line">
            <UserAvatar
              avatar={request.avatar}
              userId={request.user_id}
              avatarDecoration={request.avatar_decoration}
              size={28}
              displayName={request.username}
            />
            <span className="detail-requested-label">
              {request.anonymous ? "Anonymous" : request.username}
            </span>
            <span className="detail-date-sep">·</span>
            <span className="detail-date">{formatDate(request.created_at)}</span>
          </div>

          {/* Stats row */}
          <div className="detail-stats-and-links">
            <div className="detail-stats-line">
              {canUpvote ? (
                <button
                  type="button"
                  className={clsx(
                    "detail-stats-item",
                    "detail-stats-item-upvotes",
                    request.hasUpvoted && "active"
                  )}
                  onClick={handleUpvote}
                  disabled={upvoting}
                  aria-pressed={request.hasUpvoted}
                >
                  <BiIcon name="hand-thumbs-up-fill" size={16} />
                  {request.upvotes}
                </button>
              ) : (
                <span className="detail-stats-item detail-stats-item-upvotes">
                  <BiIcon name="hand-thumbs-up" size={16} />
                  {request.upvotes}
                </span>
              )}
              <span className="detail-stats-item detail-stats-item-comments">
                <BiIcon name="chat-dots" size={16} />
                {request.comments_count}
              </span>
              <span className="detail-stats-item detail-stats-item-views">
                <BiIcon name="eye" size={16} />
                {request.views}
              </span>
              {request.price && (
                <span className="detail-meta-price">
                  <BiIcon name="tag" size={14} />
                  {request.price}
                </span>
              )}
            </div>
            <button
              type="button"
              className="detail-share-btn"
              onClick={handleShare}
              title={copied ? "Copied!" : "Share"}
            >
              <BiIcon name={copied ? "check-lg" : "share"} size={18} />
            </button>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div className={clsx("detail-status-message", `status-${request.status}`)}>
              {request.status === "completed" && <BiIcon name="check-circle-fill" size={18} />}
              {request.status === "rejected" && <BiIcon name="x-circle-fill" size={18} />}
              {request.status === "cancelled" && <BiIcon name="dash-circle-fill" size={18} />}
              <p>{statusMsg}</p>
            </div>
          )}

          {/* Action row: creator + product links */}
          <div className="detail-action-row">
            <div className="detail-action-left">
              {request.creator_url && (
                <a
                  href={request.creator_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link-btn"
                >
                  <CreatorAvatar url={request.creator_avatar} size={20} className="detail-creator-avatar" />
                  <span>{request.creator_name || "Creator"}</span>
                  {request.creator_platform && (
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{request.creator_platform}</span>
                  )}
                </a>
              )}
              {request.product_url && (
                <a
                  href={request.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link-btn"
                >
                  <BiIcon name="box-arrow-up-right" size={14} />
                  <span>View original product</span>
                </a>
              )}
              {request.leak_message_url && (
                <a
                  href={request.leak_message_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link-btn"
                >
                  <BiIcon name="discord" size={16} />
                  <span>Available in Discord</span>
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="detail-description-section">
              <h3>About this request</h3>
              <MarkdownProse content={request.description} className="requests-prose" />
            </div>
          )}

          {/* Download CTA */}
          {request.leak_message_url && (
            <div className="leak-access-section">
              <a
                href={request.leak_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-leak-large"
              >
                <BiIcon name="discord" size={20} />
                Download in Discord
              </a>
            </div>
          )}

          {/* Cancel request */}
          {canRequestCancel && (
            <div className="detail-cancel-request-section">
              <button
                type="button"
                className="detail-cancel-request-btn"
                onClick={() => setShowCancelModal(true)}
              >
                <BiIcon name="x-circle" size={18} />
                <span>Request cancellation</span>
              </button>
            </div>
          )}

          {request.cancel_requested_at && (
            <div className="detail-cancel-request-section">
              <span className="requests-tag requests-tag-cancel-requested">
                Cancellation requested
              </span>
            </div>
          )}

          {request.has_priority && request.status === "pending" && (
            <div style={{ marginBottom: 16 }}>
              <span className="requests-tag requests-tag-priority">⭐ Priority</span>
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

      <section className="request-detail-comments">
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

