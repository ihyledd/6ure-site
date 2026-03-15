"use client";

import { useRef } from "react";
import Link from "next/link";
import clsx from "clsx";

import { CreatorAvatar } from "./CreatorAvatar";
import { BiIcon } from "./BiIcon";
import { UserAvatar } from "./UserAvatar";
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

  const cardContent = (
    <>
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
      </div>
      <div className="requests-card-content">
        <h3 className="requests-card-title">{decodeHtmlEntities(title)}</h3>
        {descSnippet && (
          <p className="requests-card-description">{decodeHtmlEntities(descSnippet)}</p>
        )}
        {request.price && (
          <span className="requests-card-price">{request.price}</span>
        )}
        <div className="requests-card-tags">
          <span
            className={clsx(
              "requests-tag",
              "requests-tag-status",
              `requests-tag-${request.status}`
            )}
          >
            {request.status}
          </span>
          {request.has_priority && (
            <span className="requests-tag requests-tag-priority">Priority</span>
          )}
          {request.patreon_premium && (
            <span className="requests-tag requests-tag-premium" title="Premium Request">
              <BiIcon name="star-fill" size={12} style={{ marginRight: 4, color: "#ffd700" }} /> Premium
            </span>
          )}
        </div>

        <div className="requests-card-footer">
          <div className="requests-card-author">
            <UserAvatar
              avatar={request.avatar}
              userId={request.user_id}
              avatarDecoration={request.avatar_decoration}
              size={24}
              displayName={request.username}
            />
            <span className="requests-card-username">{request.username}</span>
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
        {variant === "main" && (
          <div className="requests-card-stats">
            {canUpvote && onUpvote && (
              <button
                type="button"
                className={clsx(
                  "requests-upvote-btn",
                  request.hasUpvoted && "requests-upvote-btn-active"
                )}
                onClick={(e) => onUpvote(e, request.id, !!request.hasUpvoted)}
                disabled={upvoting}
                aria-pressed={request.hasUpvoted}
              >
                <BiIcon name="hand-thumbs-up-fill" size={16} />
                <span>{request.upvotes}</span>
              </button>
            )}
            {!canUpvote && (
              <span className="requests-stat-item">
                <BiIcon name="hand-thumbs-up" size={14} />
                {request.upvotes}
              </span>
            )}
            <span className="requests-stat-item">
              <BiIcon name="chat-dots" size={14} />
              {request.comments_count}
            </span>
            <span className="requests-stat-item">
              <BiIcon name="eye" size={14} />
              {request.views}
            </span>
          </div>
        )}
      </div>
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
