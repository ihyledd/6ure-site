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
import { DeleteRequestModal } from "./DeleteRequestModal";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copied, setCopied] = useState(false);
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
            setUpvoters(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
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
      <Link href="/requests" className="btn-back-top">
        <BiIcon name="arrow-left" size={16} /> Back to Requests
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

        {/* Content area */}
        <div className="detail-content">
          {/* User + date */}
          <div className="detail-requested-by-line">
            <UserAvatar
              avatar={request.avatar}
              userId={request.user_id}
              avatarDecoration={request.avatar_decoration}
              size={24}
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
                  <BiIcon name="hand-thumbs-up" size={16} />
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
              <BiIcon name={copied ? "check-lg" : "share"} size={16} />
            </button>
          </div>

          {/* Status message */}
          {statusMsg && (
            <div className={clsx("detail-status-message", `status-${request.status}`)}>
              {request.status === "completed" && <BiIcon name="check-circle-fill" size={16} />}
              {request.status === "rejected" && <BiIcon name="x-circle-fill" size={16} />}
              {request.status === "cancelled" && <BiIcon name="dash-circle-fill" size={16} />}
              <p>{statusMsg}</p>
            </div>
          )}

          {/* Resource Info Section */}
          <section className="detail-resource-info">
            <dl className="detail-resource-list">
              <dt>CREATOR</dt>
              <dd>
                {request.creator_name ? (
                  <a
                    href={request.creator_url || "#"}
                    className="detail-resource-link detail-creator-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {request.creator_avatar && (
                      <img
                        src={request.creator_avatar}
                        alt={request.creator_name}
                        className="detail-creator-avatar"
                        style={{ width: 24, height: 24, borderRadius: '50%' }}
                      />
                    )}
                    <span>{request.creator_name}</span>
                    {request.creator_platform && (
                      <span className="requests-tag" style={{ fontSize: 10, padding: '2px 6px', transform: 'translateY(-1px)' }}>
                        {request.creator_platform}
                      </span>
                    )}
                  </a>
                ) : (
                  <span>-</span>
                )}
              </dd>

              <dt>PRODUCT</dt>
              <dd>
                {request.product_url ? (
                  <a
                    href={request.product_url}
                    className="detail-resource-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BiIcon name="box" size={14} />
                    View original product
                  </a>
                ) : (
                  <span>-</span>
                )}
              </dd>

              <dt>DOWNLOAD</dt>
              <dd>
                {request.leak_message_url ? (
                  <a
                    href={request.leak_message_url}
                    className="detail-resource-link"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#5865F2' }}
                  >
                    <BiIcon name="discord" size={16} />
                    Available in Discord
                  </a>
                ) : (
                  <span>-</span>
                )}
              </dd>
            </dl>
          </section>

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

          {/* Bottom Actions Row (Upvoters / Delete) */}
          <div className="detail-action-row">
            <div className="detail-action-left">
              <div className="detail-upvoters-compact">
                <button
                  type="button"
                  className="upvoters-trigger-compact"
                  onClick={() => setShowUpvoters((v) => !v)}
                  aria-expanded={showUpvoters}
                  aria-controls="upvoters-dropdown"
                >
                  <BiIcon name="people" size={16} />
                  <span>Upvoters ({request.upvotes})</span>
                </button>

                {showUpvoters && (
                  <div id="upvoters-dropdown" className="upvoters-dropdown" role="menu">
                    {upvotersLoading ? (
                      <p className="upvoters-loading" style={{ margin: 0, padding: 8, fontSize: 13, color: 'var(--text-tertiary)' }}>Loading upvoters...</p>
                    ) : upvoters.length === 0 ? (
                      <p className="upvoters-loading" style={{ margin: 0, padding: 8, fontSize: 13, color: 'var(--text-tertiary)' }}>
                        {isAdmin ? "No upvoters yet." : "You must be a staff member to see upvoters."}
                      </p>
                    ) : (
                      <ul className="upvoters-list">
                        {upvoters.map((user) => (
                          <li key={user.id} className="upvoter-item">
                            <img
                              src={user.avatar || user.avatarUrl || `https://cdn.discordapp.com/embed/avatars/0.png`}
                              alt={user.username}
                              style={{ width: 24, height: 24, borderRadius: '50%' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <a
                                href={`https://discord.com/users/${user.discord_id || user.id}`}
                                className="detail-resource-link"
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 13, fontWeight: 500 }}
                              >
                                {user.username}
                              </a>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {user.created_at ? formatDate(user.created_at) : "Unknown date"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  className="btn-delete-request"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <BiIcon name="trash" size={16} /> Delete
                </button>
              )}
            </div>
          </div>
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

