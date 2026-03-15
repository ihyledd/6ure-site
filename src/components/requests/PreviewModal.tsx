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
        <h2 id="preview-modal-title" className="requests-modal-title">
          {title}
        </h2>

        {!hasUser && (
          <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>{loginRequired}</p>
        )}

        {hasUser && (
          <>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Request Title *
            </label>
            {titleHint && (
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-secondary)" }}>{titleHint}</p>
            )}
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value.slice(0, 500))}
              placeholder={titlePlaceholder}
              maxLength={500}
              className="requests-search-input"
              style={{ width: "100%", marginBottom: 16 }}
            />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Product Image
            </label>
            {data.image_url ? (
              <img
                src={getRequestImageUrl(data.image_url) ?? data.image_url}
                alt=""
                style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, marginBottom: 16 }}
              />
            ) : (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>{noImage}</p>
            )}

            {data.price != null && data.price !== "" && (
              <>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Price</label>
                <p style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>
                  {decodeHtmlEntities(data.price)}
                </p>
              </>
            )}

            {data.description != null && data.description !== "" ? (
              <>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Description</label>
                <div
                  style={{
                    margin: "0 0 16px",
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    maxHeight: 120,
                    overflow: "auto",
                  }}
                  className="requests-preview-description"
                >
                  <MarkdownProse content={data.description} className="requests-prose" />
                </div>
              </>
            ) : null}

            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Links</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {data.creator_avatar ? (
                <CreatorAvatar url={data.creator_avatar} size={24} />
              ) : null}
              <a href={data.creator_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
                Creator: {data.creator_name || "Creator Profile"}
              </a>
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <a href={data.product_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
                Product Page
              </a>
            </div>

            {anonymous && (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>{anonymousBadge}</p>
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
                {loading ? creating : btnConfirm}
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
