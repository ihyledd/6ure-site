"use client";

import { useState } from "react";
import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";
import { decodeHtmlEntities, getRequestImageUrl } from "@/lib/requests-utils";
import { CreatorAvatar } from "./CreatorAvatar";
import { MarkdownProse } from "@/components/Markdown";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface PreviewData {
  title: string;
  description?: string | null;
  image_url?: string | null;
  price?: string | null;
  creator_url: string;
  product_url: string;
  creator_name?: string | null;
  creator_avatar?: string | null;
}

export interface PreviewModalProps {
  data: PreviewData;
  anonymous: boolean;
  onConfirm: (editableTitle: string) => void;
  onCancel: () => void;
  loading?: boolean;
  user: { id: string } | null;
  popupsOverride?: Record<string, string> | null;
}

export function PreviewModal({
  data,
  anonymous,
  onConfirm,
  onCancel,
  loading,
  user,
  popupsOverride,
}: PreviewModalProps) {
  const [editableTitle, setEditableTitle] = useState(data.title || "");
  const merged = { ...DEFAULT_POPUPS, ...(popupsOverride || {}) };

  const title = getPopup("popup_preview_title", merged);
  const titleHint = getPopup("popup_preview_title_hint", merged);
  const titlePlaceholder = getPopup("popup_preview_title_placeholder", merged);
  const noImage = getPopup("popup_preview_no_image", merged);
  const anonymousBadge = getPopup("popup_preview_anonymous", merged);
  const loginRequired = getPopup("popup_preview_login_required", merged);
  const btnCancel = getPopup("popup_preview_btn_cancel", merged);
  const btnConfirm = getPopup("popup_preview_btn_confirm", merged);
  const creating = getPopup("popup_preview_creating", merged);

  const hasUser = !!user;

  return (
    <div
      className="requests-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button type="button" className="requests-modal-close" onClick={onCancel} aria-label="Close">
          {CLOSE_ICON}
        </button>

        {/* Step indicator */}
        <div className="rf-step-indicator">
          <span className="rf-step-dot completed">✓</span>
          <div className="rf-step-line active" />
          <span className="rf-step-dot active">2</span>
        </div>

        <h2 id="preview-modal-title" className="requests-modal-title">
          {title}
        </h2>

        {!hasUser && (
          <div className="rf-login-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
              <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {loginRequired}
          </div>
        )}

        {hasUser && (
          <>
            {/* Editable title */}
            <div className="rf-preview-section">
              <label className="rf-preview-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
                Request Title
              </label>
              {titleHint && (
                <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--text-tertiary)" }}>{titleHint}</p>
              )}
              <input
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value.slice(0, 500))}
                placeholder={titlePlaceholder}
                maxLength={500}
                className="requests-search-input"
                style={{ width: "100%" }}
              />
            </div>

            {/* Product image */}
            <div className="rf-preview-section">
              <label className="rf-preview-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                Product Image
              </label>
              <div className="rf-preview-image-card">
                {data.image_url ? (
                  <img
                    src={getRequestImageUrl(data.image_url) ?? data.image_url}
                    alt=""
                  />
                ) : (
                  <div className="rf-preview-no-image">{noImage}</div>
                )}
              </div>
            </div>

            {/* Price */}
            {data.price != null && data.price !== "" && (
              <div className="rf-preview-section">
                <label className="rf-preview-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  Price
                </label>
                <span className="rf-preview-price">
                  {decodeHtmlEntities(data.price)}
                </span>
              </div>
            )}

            {/* Description */}
            {data.description != null && data.description !== "" && (
              <div className="rf-preview-section">
                <label className="rf-preview-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                  Description
                </label>
                <div className="rf-preview-desc-card">
                  <MarkdownProse content={data.description} className="requests-prose" />
                </div>
              </div>
            )}

            {/* Links */}
            <div className="rf-preview-section">
              <label className="rf-preview-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                Links
              </label>
              <div className="rf-preview-links">
                {data.creator_avatar ? (
                  <CreatorAvatar url={data.creator_avatar} size={24} />
                ) : null}
                <a href={data.creator_url} target="_blank" rel="noopener noreferrer" className="rf-preview-link-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  {data.creator_name || "Creator Profile"}
                </a>
                <a href={data.product_url} target="_blank" rel="noopener noreferrer" className="rf-preview-link-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  Product Page
                </a>
              </div>
            </div>

            {/* Anonymous badge */}
            {anonymous && (
              <div className="rf-preview-section">
                <span className="rf-anon-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {anonymousBadge}
                </span>
              </div>
            )}

            <div className="requests-modal-actions">
              <button
                type="button"
                className="guild-invite-btn guild-invite-btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                {btnCancel}
              </button>
              <button
                type="button"
                className="guild-invite-btn guild-invite-btn-primary"
                onClick={() => onConfirm(editableTitle.trim() || data.title || "")}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="rf-btn-spinner" />
                    {creating}
                  </>
                ) : btnConfirm}
              </button>
            </div>
          </>
        )}

        {!hasUser && (
          <div className="requests-modal-actions">
            <button type="button" className="guild-invite-btn guild-invite-btn-secondary" onClick={onCancel}>
              {btnCancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
