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
import { getPriceTier } from "@/lib/price-utils";

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

const DESCRIPTION_SNIPPET_LENGTH = 120;

function truncateDescription(desc: string | null | undefined): string {
  if (!desc || typeof desc !== "string") return "";
  const trimmed = desc.trim();
  if (trimmed.length <= DESCRIPTION_SNIPPET_LENGTH) return trimmed;
  return trimmed.slice(0, DESCRIPTION_SNIPPET_LENGTH).trim() + "…";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "PENDING";
    case "completed": return "AVAILABLE";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    default: return status.toUpperCase();
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "pending": return "⏳";
    case "completed": return "✅";
    case "rejected": return "❌";
    case "cancelled": return "🚫";
    default: return "●";
  }
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
  const cardRef = useRef<HTMLAnchorElement | HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const title = buildRequestTitle(request);
  const descSnippet = truncateDescription(request.description);
  const imgUrl = getRequestImageUrl(request.image_url) ?? request.image_url;
  const priceTier = getPriceTier(request.price);
  const isCompleted = request.status === "completed";

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    onRefresh?.();
  };

  const cardContent = (
    <>
      {/* Hero image with overlaid badges */}
      <div className="requests-card-image-wrapper">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt=""
            className="requests-card-image"
            loading="lazy"
          />
        ) : (
          <div className="requests-card-image-placeholder">
            <BiIcon name="image" size={32} />
          </div>
        )}

        {/* Overlay badges */}
        <div className="requests-card-image-overlay">
          <div className="requests-card-badges-left">
            {request.has_priority && (
              <span className="requests-card-badge requests-card-badge-priority">
                ⭐ PRIORITY
              </span>
            )}
            <span className={clsx(
              "requests-card-badge",
              `requests-card-badge-${request.status}`
            )}>
              {getStatusIcon(request.status)} {getStatusLabel(request.status)}
            </span>
          </div>

          {isStaff && (
            <button
              type="button"
              className="requests-card-delete-btn"
              onClick={handleDeleteClick}
              title="Delete request"
              aria-label="Delete request"
            >
              <BiIcon name="trash3-fill" size={16} />
            </button>
          )}
        </div>

        {/* Title overlay on image */}
        <div className="requests-card-image-title-overlay">
          <h3 className="requests-card-overlay-title">{decodeHtmlEntities(title)}</h3>
        </div>
      </div>

      {/* Content section */}
      <div className="requests-card-content">
        <h3 className="requests-card-title">{decodeHtmlEntities(title)}</h3>

        {descSnippet && (
          <p className="requests-card-description">{decodeHtmlEntities(descSnippet)}</p>
        )}

        {request.price && (
          <span className={clsx(
            "requests-card-price",
            priceTier && `requests-card-price-${priceTier}`
          )}>
            PRICE <strong>{request.price}</strong>
          </span>
        )}

        <div className="requests-card-footer">
          <div className="requests-card-author">
            {request.username === "Anonymous" ? (
              <span className="requests-card-anonymous-badge">
                <BiIcon name="question-circle" size={16} />
                <span>Anonymous</span>
                {request.patreon_premium && (
                  <span className="requests-card-premium-star" title="Premium">⭐</span>
                )}
              </span>
            ) : (
              <div className="requests-card-user-info">
                <UserAvatar
                  avatar={request.avatar}
                  userId={request.user_id}
                  avatarDecoration={request.avatar_decoration}
                  size={22}
                  displayName={request.username}
                />
                <span className="requests-card-username">{request.username}</span>
                {request.patreon_premium && (
                  <span className="requests-card-premium-star" title="Premium">⭐</span>
                )}
              </div>
            )}
          </div>
          <span className="requests-card-date">{formatDate(request.created_at)}</span>
        </div>

        <div className="requests-links-row">
          <a
            href={request.creator_url}
            target="_blank"
            rel="noopener noreferrer"
            className="requests-link-btn requests-creator-link"
            onClick={(e) => e.stopPropagation()}
          >
            <CreatorAvatar url={request.creator_avatar} size={18} />
            <span>{request.creator_name || "Creator"}</span>
            <BiIcon name="box-arrow-up-right" size={14} />
          </a>
          <a
            href={request.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="requests-link-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Product</span>
            <BiIcon name="box-arrow-up-right" size={14} />
          </a>
        </div>

        {/* Discord download button for completed requests */}
        {isCompleted && request.leak_message_url && (
          <a
            href={request.leak_message_url}
            target="_blank"
            rel="noopener noreferrer"
            className="requests-card-discord-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <BiIcon name="discord" size={18} />
            Download in Discord
          </a>
        )}

        {variant === "main" && (
          <div className="requests-card-stats">
            {canUpvote && onUpvote ? (
              <button
                type="button"
                className={clsx(
                  "requests-stat-pill",
                  "requests-upvote-pill",
                  request.hasUpvoted && "requests-upvote-pill-active"
                )}
                onClick={(e) => onUpvote(e, request.id, !!request.hasUpvoted)}
                disabled={upvoting}
                aria-pressed={request.hasUpvoted}
              >
                <BiIcon name="hand-thumbs-up-fill" size={14} />
                <span>{request.upvotes}</span>
              </button>
            ) : (
              <span className="requests-stat-pill">
                <BiIcon name="hand-thumbs-up" size={14} />
                <span>{request.upvotes}</span>
              </span>
            )}
            <span className="requests-stat-pill">
              <BiIcon name="eye" size={14} />
              <span>{request.views}</span>
            </span>
            <span className="requests-stat-pill">
              <BiIcon name="chat-dots" size={14} />
              <span>{request.comments_count}</span>
            </span>
          </div>
        )}
      </div>

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

  if (variant === "main") {
    return (
      <Link
        href={`/requests/request/${request.id}`}
        ref={cardRef as any}
        onMouseMove={handleMouseMove}
        className={clsx(
          "requests-request-card",
          showStaffBadge && request.is_staff && "requests-request-card-staff",
          request.patreon_premium && "requests-request-card-premium"
        )}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <Link
      href={`/requests/request/${request.id}`}
      ref={cardRef as any}
      onMouseMove={handleMouseMove}
      className={clsx(
        "your-request-card",
        request.status
      )}
    >
      <div className="your-request-card-header">
        <div className="your-request-title-section">
          <h3>{decodeHtmlEntities(title)}</h3>
        </div>
      </div>
      {descSnippet && (
        <p className="your-request-description">{decodeHtmlEntities(descSnippet)}</p>
      )}
      <div className="your-request-stats">
        <div className="stat-item">
          <BiIcon name="hand-thumbs-up" size={14} />
          <span>{request.upvotes}</span>
        </div>
        <div className="stat-item">
          <BiIcon name="chat-dots" size={14} />
          <span>{request.comments_count}</span>
        </div>
        <div className="stat-item">
          <BiIcon name="eye" size={14} />
          <span>{request.views}</span>
        </div>
        {request.price && (
          <div className="stat-item">
            <span>{request.price}</span>
          </div>
        )}
        <div className="stat-item">
          <span className={clsx("requests-tag", `requests-tag-${request.status}`)}>
            {request.status}
          </span>
        </div>
      </div>
      <div className="requests-links-row">
        <a
          href={request.creator_url}
          target="_blank"
          rel="noopener noreferrer"
          className="requests-link-btn requests-creator-link"
          onClick={(e) => e.stopPropagation()}
        >
          <CreatorAvatar url={request.creator_avatar} size={18} />
          <span>{request.creator_name || "Creator"}</span>
          <BiIcon name="box-arrow-up-right" size={14} />
        </a>
        <a
          href={request.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="requests-link-btn"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Product</span>
          <BiIcon name="box-arrow-up-right" size={14} />
        </a>
      </div>
    </Link>
  );
}
