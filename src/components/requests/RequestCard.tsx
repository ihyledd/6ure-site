"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import clsx from "clsx";

import { CreatorAvatar } from "./CreatorAvatar";
import { BiIcon } from "./BiIcon";
import { UserAvatar } from "./UserAvatar";
import { DeleteRequestModal } from "./DeleteRequestModal";
import {
  formatDate,
  getRequestImageUrl,
  buildRequestTitle,
  decodeHtmlEntities,
} from "@/lib/requests-utils";

export type RequestCardRequest = {
  id: number;
  title: string | null;
  description: string | null;
  creator_url: string;
  product_url: string;
  image_url: string | null;
  price: string | null;
  status: string;
  upvotes: number;
  views: number;
  comments_count: number;
  created_at: string;
  username: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
  leak_message_url?: string | null;
  hasUpvoted?: boolean;
  is_staff?: boolean;
  has_priority?: boolean;
  patreon_premium?: boolean;
  user_id?: string | null;
  avatar?: string | null;
  avatar_decoration?: string | null;
  anonymous?: boolean;
  comments_locked?: boolean;
};

type Props = {
  request: RequestCardRequest;
  variant: "main" | "yours";
  showStaffBadge?: boolean;
  isStaff?: boolean;
  canUpvote?: boolean;
  onUpvote?: (e: React.MouseEvent, requestId: number, currentUpvoted: boolean) => void;
  upvoting?: boolean;
  onRefresh?: () => void;
};

function getStatusConfig(status: string) {
  switch (status) {
    case "pending": return { icon: "clock", label: "Pending", color: "#f59e0b" };
    case "completed": return { icon: "check-circle-fill", label: "Available", color: "#10b981" };
    case "rejected": return { icon: "x-circle-fill", label: "Rejected", color: "#ef4444" };
    case "cancelled": return { icon: "slash-circle", label: "Cancelled", color: "#6b7280" };
    default: return { icon: "circle", label: status.toUpperCase(), color: "#5865f2" };
  }
}

function getPriceColor(priceStr: string | null): { color: string; bg: string; border: string } {
  if (!priceStr) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num < 10) return { color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
  if (num < 20) return { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.25)" };
  if (num < 50) return { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.25)" };
  return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)" };
}

export function RequestCard({
  request,
  variant,
  showStaffBadge = false,
  isStaff = false,
  canUpvote = false,
  onUpvote,
  upvoting = false,
  onRefresh,
}: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const title = buildRequestTitle(request);
  const imgUrl = getRequestImageUrl(request.image_url) ?? request.image_url;
  const isCompleted = request.status === "completed";
  const isPriority = request.has_priority && request.status !== "completed";
  const statusConfig = getStatusConfig(request.status);
  const isAnonymous = request.username === "Anonymous" || request.anonymous;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    onRefresh?.();
  };

  // --- "yours" variant: compact card for /requests/your-requests ---
  if (variant === "yours") {
    const priceColors = request.price ? getPriceColor(request.price) : null;
    return (
      <Link
        href={`/requests/request/${request.id}`}
        className={clsx("your-request-card", request.status)}
      >
        {/* Top row: status badge + price */}
        <div className="yrc-top-row">
          <span
            className={clsx("yrc-status", `yrc-status-${request.status}`)}
            style={{ "--tag-color": statusConfig.color } as React.CSSProperties}
          >
            <BiIcon name={statusConfig.icon} size={11} />
            <span>{statusConfig.label}</span>
          </span>
          {request.price && priceColors && (
            <span
              className="yrc-price"
              style={{
                "--price-color": priceColors.color,
                "--price-bg": priceColors.bg,
                "--price-border": priceColors.border,
              } as React.CSSProperties}
            >
              <BiIcon name="tag" size={11} />
              {request.price}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="yrc-title">{decodeHtmlEntities(title)}</h3>

        {/* Description */}
        {request.description && (
          <p className="yrc-desc">
            {decodeHtmlEntities(request.description.slice(0, 100))}
          </p>
        )}

        {/* Inline stats */}
        <div className="yrc-stats">
          <span className="yrc-stat">
            <BiIcon name="hand-thumbs-up" size={13} />
            {request.upvotes}
          </span>
          <span className="yrc-stat">
            <BiIcon name="chat-dots" size={13} />
            {request.comments_count}
          </span>
          <span className="yrc-stat">
            <BiIcon name="eye" size={13} />
            {request.views}
          </span>
        </div>

        {/* Links */}
        <div className="yrc-links">
          <a
            href={request.creator_url}
            target="_blank"
            rel="noopener noreferrer"
            className="yrc-link"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <CreatorAvatar url={request.creator_avatar} size={16} />
            <span>{request.creator_name || "Creator"}</span>
            <BiIcon name="box-arrow-up-right" size={10} />
          </a>
          <a
            href={request.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="yrc-link"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <span>Product</span>
            <BiIcon name="box-arrow-up-right" size={10} />
          </a>
        </div>
      </Link>
    );
  }

  // --- "main" variant: full card matching old site structure ---
  return (
    <>
      <Link
        href={`/requests/request/${request.id}`}
        className={clsx(
          "request-card",
          request.patreon_premium && "premium",
          isCompleted && "completed",
          isPriority && "priority"
        )}
      >
        {/* Image */}
        {imgUrl ? (
          <div className="request-image-wrapper">
            <div className="request-image">
              <img src={imgUrl} alt={title} loading="lazy" />
              <div className="image-overlay" />
            </div>
            {isCompleted && (
              <span className="completed-badge">
                <BiIcon name="check-circle-fill" size={14} />
                <span>Available</span>
              </span>
            )}
          </div>
        ) : (
          <div className="request-image-placeholder">
            <div className="placeholder-icon">📦</div>
          </div>
        )}

        {/* Content */}
        <div className="request-content">
          {/* Tags row */}
          <div className="request-tags">
            {isPriority && (
              <span className="request-tag request-tag-priority" style={{ "--tag-color": "#fbbf24" } as React.CSSProperties}>
                <BiIcon name="star-fill" size={14} />
                <span>Priority</span>
              </span>
            )}
            <span className="request-tag" style={{ "--tag-color": statusConfig.color } as React.CSSProperties}>
              <BiIcon name={statusConfig.icon} size={14} />
              <span>{statusConfig.label}</span>
            </span>
            {request.comments_locked && (
              <span className="request-tag request-tag-locked">
                <BiIcon name="lock-fill" size={12} />
                <span>Locked</span>
              </span>
            )}
          </div>

          {/* Staff delete button */}
          {isStaff && (
            <button
              type="button"
              className="request-card-delete"
              title="Delete request"
              onClick={handleDeleteClick}
            >
              <BiIcon name="trash3-fill" size={14} />
            </button>
          )}

          {/* Title */}
          <div className="request-header">
            <div className="request-title-section">
              <div className="request-title-row">
                <h3 className="request-title">{decodeHtmlEntities(title)}</h3>
              </div>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <p className="request-description">{decodeHtmlEntities(request.description)}</p>
          )}

          {/* Price */}
          {request.price && (
            <div
              className="request-price-box"
              style={{
                "--price-color": getPriceColor(request.price).color,
                "--price-bg": getPriceColor(request.price).bg,
                "--price-border": getPriceColor(request.price).border,
              } as React.CSSProperties}
            >
              <span className="request-price-label">Price</span>
              <span className="request-price-value">{decodeHtmlEntities(request.price)}</span>
            </div>
          )}

          {/* Footer */}
          <div className="request-footer">
            {/* Author & Date row */}
            <div className="request-meta-row">
              <div className="request-author-info">
                {!isAnonymous && request.user_id ? (
                  <>
                    <UserAvatar
                      avatar={request.avatar}
                      userId={request.user_id}
                      avatarDecoration={request.avatar_decoration}
                      size={24}
                      displayName={request.username}
                    />
                    <span className="request-author">{request.username}</span>
                    {showStaffBadge && request.is_staff && (
                      <span className="staff-badge-inline" title="Staff">
                        <BiIcon name="shield-fill" size={12} /> Staff
                      </span>
                    )}
                    {request.patreon_premium && (
                      <span className="premium-indicator">⭐</span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="anonymous-avatar"><span>?</span></div>
                    <span className="request-author anonymous">Anonymous</span>
                    {request.patreon_premium && (
                      <span className="premium-indicator">⭐</span>
                    )}
                  </>
                )}
              </div>
              <span className="request-date">{formatDate(request.created_at)}</span>
            </div>

            {/* Links row */}
            <div className="request-links-row">
              <a
                href={request.creator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="request-link-btn request-creator-link"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <CreatorAvatar url={request.creator_avatar} size={22} />
                <span>{request.creator_name || "Creator"}</span>
                <BiIcon name="box-arrow-up-right" size={12} />
              </a>
              <a
                href={request.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="request-link-btn"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <span>Product</span>
                <BiIcon name="box-arrow-up-right" size={12} />
              </a>
            </div>

            {/* Leak download button */}
            {isCompleted && request.leak_message_url && (
              <a
                href={request.leak_message_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-leak"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <BiIcon name="discord" size={18} />
                Download in Discord
              </a>
            )}

            {/* Actions row: upvote / views / comments */}
            <div className="request-actions">
              {canUpvote && onUpvote ? (
                <button
                  type="button"
                  className={clsx("btn-upvote", request.hasUpvoted && "upvoted")}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUpvote(e, request.id, !!request.hasUpvoted);
                  }}
                  disabled={upvoting || isCompleted || request.status === "rejected"}
                >
                  <BiIcon name="hand-thumbs-up-fill" size={16} />
                  <span>{request.upvotes || 0}</span>
                </button>
              ) : (
                <span className="btn-upvote" style={{ cursor: "default" }}>
                  <BiIcon name="hand-thumbs-up" size={16} />
                  <span>{request.upvotes || 0}</span>
                </span>
              )}

              <span className="request-views" title="Views">
                <BiIcon name="eye" size={16} />
                <span>{request.views ?? 0}</span>
              </span>

              <span className="btn-comments">
                <BiIcon name="chat-dots" size={16} />
                <span>{request.comments_count || 0}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete modal portal */}
      {showDeleteModal &&
        typeof document !== "undefined" &&
        createPortal(
          <DeleteRequestModal
            requestId={request.id}
            requestTitle={title}
            onClose={() => setShowDeleteModal(false)}
            onDeleted={handleDeleted}
          />,
          document.body
        )}
    </>
  );
}
