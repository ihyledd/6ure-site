"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PreviewModal } from "./PreviewModal";
import { LeakModal } from "./LeakModal";
import { ProtectedModal } from "./ProtectedModal";
import { PremiumUpsellModal } from "./PremiumUpsellModal";
import { DEFAULT_POPUPS } from "@/lib/requests-popups";
import type { PreviewData } from "./PreviewModal";
import type { LeakInfo } from "./LeakModal";

export interface RequestFormProps {
  user: { id: string } | null;
  isPremium?: boolean;
  onRequestCreated: () => void;
  onClose: () => void;
  onNotInGuild: () => void;
  discordLoginUrl: string;
}

export function RequestForm({ user, isPremium, onRequestCreated, onClose, onNotInGuild, discordLoginUrl }: RequestFormProps) {
  const [creatorUrl, setCreatorUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [anonymous, setAnonymous] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("settings-anonymous-default") === "true" : true
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showLeakModal, setShowLeakModal] = useState(false);
  const [leakInfo, setLeakInfo] = useState<LeakInfo | null>(null);
  const [showProtectedModal, setShowProtectedModal] = useState(false);
  const [protectedMessage, setProtectedMessage] = useState("");
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [pendingUpsellCloseAction, setPendingUpsellCloseAction] = useState<(() => void) | null>(null);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [popups, setPopups] = useState<Record<string, string>>(DEFAULT_POPUPS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAnonymous(localStorage.getItem("settings-anonymous-default") === "true");
    }
  }, [user?.id]);

  useEffect(() => {
    fetch("/api/site-settings/popups")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setPopups((p) => ({ ...p, ...data })))
      .catch(() => {});
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDuplicateId(null);
    setLeakInfo(null);
    setShowLeakModal(false);
    setShowProtectedModal(false);

    const cUrl = creatorUrl.trim();
    const pUrl = productUrl.trim();
    if (!cUrl || !pUrl) {
      setError("Please fill in both URLs");
      return;
    }

    const hasPremium = user && isPremium;
    if (user && !hasPremium) {
      const chance = Math.random();
      if (chance < 0.15) {
        setPendingUpsellCloseAction(() => () => doPreview(cUrl, pUrl));
        setShowUpsellModal(true);
        return;
      }
    }

    doPreview(cUrl, pUrl);
  };

  const doPreview = async (cUrl: string, pUrl: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/requests/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_url: pUrl, creator_url: cUrl }),
      });
      const data = await res.json();

      if (data.leaked && data.leak) {
        setLeakInfo(data.leak);
        setShowLeakModal(true);
        return;
      }

      if (!res.ok) {
        if (res.status === 400 && data.duplicate && data.existingRequestId != null) {
          setDuplicateId(data.existingRequestId);
          setError(data.error || "A request for this product already exists.");
        } else {
          setError(data.error || "Failed to preview request.");
        }
        return;
      }

      setPreviewData({
        title: data.title || "Untitled Product",
        description: data.description ?? null,
        image_url: data.image_url ?? null,
        price: data.price ?? null,
        creator_url: data.creator_url || cUrl,
        product_url: data.product_url || pUrl,
        creator_name: data.creator_name ?? null,
        creator_avatar: data.creator_avatar ?? null,
      });
      setShowPreviewModal(true);
    } catch {
      setError("Failed to preview request.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpsellClose = () => {
    setShowUpsellModal(false);
    const run = pendingUpsellCloseAction;
    setPendingUpsellCloseAction(null);
    if (run) run();
  };

  const handleConfirmSubmit = async (editableTitle: string) => {
    if (!previewData) return;
    setError("");
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_url: previewData.creator_url,
          product_url: previewData.product_url,
          title: editableTitle || previewData.title,
          description: previewData.description,
          image_url: previewData.image_url,
          price: previewData.price,
          creator_name: previewData.creator_name,
          creator_avatar: previewData.creator_avatar,
          creator_platform: (previewData as { creator_platform?: string }).creator_platform,
          anonymous,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setShowPreviewModal(false);
        setPreviewData(null);
        setCreatorUrl("");
        setProductUrl("");
        onRequestCreated();
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
        return;
      }

      if (res.status === 403 && data.notInGuild) {
        setShowPreviewModal(false);
        onNotInGuild();
        return;
      }
      if (res.status === 403 && data.protected) {
        setProtectedMessage(data.error || "This action is not allowed.");
        setShowProtectedModal(true);
        setShowPreviewModal(false);
        return;
      }
      if (res.status === 409 && data.leaked && data.leak) {
        setLeakInfo(data.leak);
        setShowLeakModal(true);
        setShowPreviewModal(false);
        return;
      }
      setError(data.error || "Failed to create request.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      <div className="requests-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Create request">
        <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <button type="button" className="requests-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className="requests-modal-title">Create New Request</h2>

          {!user && (
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
              Please log in to submit a request. You can still submit anonymously to hide your name.
            </p>
          )}

          <form onSubmit={handlePreview}>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Creator URL *</span>
              <input
                type="url"
                value={creatorUrl}
                onChange={(e) => setCreatorUrl(e.target.value)}
                placeholder="TikTok or YouTube only, e.g. tiktok.com/@user, youtube.com/@channel"
                className="requests-search-input"
                style={{ width: "100%", marginTop: 4 }}
                required
              />
              <small style={{ display: "block", marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                TikTok or YouTube only
              </small>
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Product URL *</span>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://example.com/product or any product page URL"
                className="requests-search-input"
                style={{ width: "100%", marginTop: 4 }}
                required
              />
              <small style={{ display: "block", marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                Any valid product or page URL (http or https)
              </small>
            </label>
            {user && (
              <label className="requests-toggle-wrap" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="requests-toggle-input"
                  aria-label="Submit anonymously"
                />
                <span className="requests-toggle-track" aria-hidden />
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Submit anonymously</span>
              </label>
            )}
            {duplicateId && (
              <p style={{ marginBottom: 12, fontSize: 14, color: "var(--text-secondary)" }}>
                A request for this product already exists.{" "}
                <a href={`/requests/request/${duplicateId}`} style={{ color: "var(--discord-blurple)" }}>
                  View existing request
                </a>
              </p>
            )}
            {error && (
              <p style={{ color: "var(--error, #ef4444)", fontSize: 14, marginBottom: 12 }}>{error}</p>
            )}
            {success && (
              <p style={{ color: "var(--success, #10b981)", fontSize: 14, marginBottom: 12 }}>
                Request created successfully!
              </p>
            )}
            <div className="requests-modal-actions">
              <button type="button" className="guild-invite-btn guild-invite-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="guild-invite-btn guild-invite-btn-primary"
                disabled={previewLoading || !user}
              >
                {previewLoading ? "Loading Preview…" : "Preview Request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPreviewModal &&
        previewData &&
        typeof document !== "undefined" &&
        createPortal(
          <PreviewModal
            data={previewData}
            anonymous={anonymous}
            onConfirm={handleConfirmSubmit}
            onCancel={() => setShowPreviewModal(false)}
            loading={submitLoading}
            user={user}
            popupsOverride={popups}
          />,
          document.body
        )}

      {showLeakModal &&
        leakInfo &&
        typeof document !== "undefined" &&
        createPortal(
          <LeakModal
            leak={leakInfo}
            onClose={() => setShowLeakModal(false)}
            popupsOverride={popups}
          />,
          document.body
        )}

      {showProtectedModal &&
        typeof document !== "undefined" &&
        createPortal(
          <ProtectedModal
            message={protectedMessage}
            onClose={() => setShowProtectedModal(false)}
            popupsOverride={popups}
          />,
          document.body
        )}

      {showUpsellModal &&
        typeof document !== "undefined" &&
        createPortal(
          <PremiumUpsellModal
            onClose={handleUpsellClose}
            popupsOverride={popups}
          />,
          document.body
        )}
    </>
  );
}
