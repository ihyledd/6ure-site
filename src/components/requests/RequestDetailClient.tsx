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

export function RequestDetailClient({ initialRequest }: Props) {
  const [request, setRequest] = useState<RequestData & { hasUpvoted?: boolean }>(initialRequest);
  const [upvoting, setUpvoting] = useState(false);
  const [showStaffBadge, setShowStaffBadge] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  return (
    <div className="request-detail-container">
      <Link href="/requests" className="requests-back-link">
        ← Back to requests
      </Link>

      <article className="request-detail-card">
        <div className="detail-image-wrapper">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt=""
              className="detail-image"
            />
          ) : (
            <div className="detail-image-placeholder">
              <BiIcon name="image" size={48} />
            </div>
          )}
        </div>

        <div className="request-detail-body">
          <h1 className="detail-title">{title}</h1>

          <div className="request-detail-meta">
            <div className="detail-author-row">
              <UserAvatar
                avatar={request.avatar}
                userId={request.user_id}
                avatarDecoration={request.avatar_decoration}
                size={32}
                displayName={request.username}
              />
              <span className="detail-username">{request.username}</span>
              <span className="detail-date">{formatDate(request.created_at)}</span>
            </div>
          </div>

          <div className="request-detail-tags">
            <span className={clsx("requests-tag", "requests-tag-status", `requests-tag-${request.status}`)}>
              {request.status}
            </span>
            {request.has_priority && (
              <span className="requests-tag requests-tag-priority">Priority</span>
            )}
            {request.cancel_requested_at && (
              <span className="requests-tag requests-tag-cancel-requested">Cancellation requested</span>
            )}
          </div>

          {request.description && (
            <div className="detail-description">
              <MarkdownProse content={request.description} className="requests-prose" />
            </div>
          )}

          {request.price && (
            <p className="detail-price">{request.price}</p>
          )}

          <div className="request-detail-links">
            <a
              href={request.creator_url}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link-btn detail-creator-link"
            >
              <CreatorAvatar url={request.creator_avatar} size={24} className="detail-creator-avatar" />
              <span>{request.creator_name || "Creator"}</span>
              <BiIcon name="box-arrow-up-right" size={16} />
            </a>
            <a
              href={request.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link-btn"
            >
              <span>Product</span>
              <BiIcon name="box-arrow-up-right" size={16} />
            </a>
            {request.leak_message_url && (
              <a
                href={request.leak_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link-btn btn-leak"
              >
                <BiIcon name="link-45deg" size={16} />
                <span>Leak</span>
                <BiIcon name="box-arrow-up-right" size={16} />
              </a>
            )}
          </div>

          <div className="request-detail-actions">
            {canRequestCancel && (
              <button
                type="button"
                className="detail-cancel-request-btn"
                onClick={() => setShowCancelModal(true)}
              >
                <BiIcon name="x-circle" size={18} />
                <span>Request cancellation</span>
              </button>
            )}
            {canUpvote && (
              <button
                type="button"
                className={clsx(
                  "detail-upvote-btn",
                  request.hasUpvoted && "detail-upvote-btn-active"
                )}
                onClick={handleUpvote}
                disabled={upvoting}
                aria-pressed={request.hasUpvoted}
              >
                <BiIcon name="hand-thumbs-up-fill" size={20} />
                <span>{request.upvotes} upvotes</span>
              </button>
            )}
            {!canUpvote && (
              <span className="detail-stat">
                <BiIcon name="hand-thumbs-up" size={18} />
                {request.upvotes} upvotes
              </span>
            )}
            <span className="detail-stat">
              <BiIcon name="chat-dots" size={18} />
              {request.comments_count} comments
            </span>
            <span className="detail-stat">
              <BiIcon name="eye" size={18} />
              {request.views} views
            </span>
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
