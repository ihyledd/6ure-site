"use client";

import { useState, useEffect } from "react";
import { getPopup, DEFAULT_POPUPS } from "@/lib/requests-popups";

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export interface CancelRequestModalProps {
  requestId: number;
  onClose: () => void;
  onSubmitted?: () => void;
  popupsOverride?: Record<string, string> | null;
}

export function CancelRequestModal({
  requestId,
  onClose,
  onSubmitted,
  popupsOverride,
}: CancelRequestModalProps) {
  const [popups, setPopups] = useState<Record<string, string>>(DEFAULT_POPUPS);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  useEffect(() => {
    fetch("/api/site-settings/popups")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setPopups((p) => ({ ...p, ...data })))
      .catch(() => {});
  }, []);

  const merged = { ...popups, ...(popupsOverride || {}) };
  const title = getPopup("popup_cancel_title", merged);
  const note = getPopup("popup_cancel_note", merged);
  const placeholder = getPopup("popup_cancel_placeholder", merged);
  const btnCancel = getPopup("popup_cancel_btn_cancel", merged);
  const btnSubmit = getPopup("popup_cancel_btn_submit", merged);
  const submittingText = getPopup("popup_cancel_submitting", merged);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    setStatus("submitting");
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      onSubmitted?.();
      onClose();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="requests-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-request-modal-title"
    >
      <div className="requests-modal-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button type="button" className="requests-modal-close" onClick={onClose} aria-label="Close">
          {CLOSE_ICON}
        </button>
        <h2 id="cancel-request-modal-title" className="requests-modal-title">
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{note}</p>
        <form onSubmit={handleSubmit} className="requests-modal-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={3}
              required
              disabled={status === "submitting"}
              className="requests-cancel-reason-input"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--glass-tertiary-bg)",
                color: "var(--text-primary)",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>
          {status === "error" && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--error)" }}>
              Something went wrong. Please try again.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              className="guild-invite-btn guild-invite-btn-secondary"
              onClick={onClose}
              disabled={status === "submitting"}
            >
              {btnCancel}
            </button>
            <button
              type="submit"
              className="guild-invite-btn guild-invite-btn-primary"
              disabled={status === "submitting" || !reason.trim()}
            >
              {status === "submitting" ? submittingText : btnSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
