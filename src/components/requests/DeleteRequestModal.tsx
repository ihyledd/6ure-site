"use client";

import { useState } from "react";
import { BiIcon } from "./BiIcon";

type Props = {
  requestId: number;
  requestTitle: string;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteRequestModal({
  requestId,
  requestTitle,
  onClose,
  onDeleted,
}: Props) {
  const [reason, setReason] = useState("");
  const [sendDm, setSendDm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          sendDm,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete request");
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delete-request-overlay" onClick={onClose}>
      <div
        className="delete-request-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-request-modal-header">
          <BiIcon name="trash3-fill" size={22} />
          <h3>Delete Request</h3>
          <button
            type="button"
            className="delete-request-close"
            onClick={onClose}
            aria-label="Close"
          >
            <BiIcon name="x-lg" size={18} />
          </button>
        </div>

        <div className="delete-request-modal-body">
          <p className="delete-request-warning">
            Are you sure you want to delete <strong>&quot;{requestTitle}&quot;</strong>?
            This action cannot be undone.
          </p>

          <label className="delete-request-label" htmlFor="delete-reason">
            Reason (optional)
          </label>
          <textarea
            id="delete-reason"
            className="delete-request-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this request being deleted?"
            rows={3}
            maxLength={500}
          />

          <label className="delete-request-toggle-row">
            <span className="delete-request-toggle-label">
              <BiIcon name="envelope-fill" size={16} />
              Send DM notification to requester
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={sendDm}
              className={`delete-request-toggle ${sendDm ? "active" : ""}`}
              onClick={() => setSendDm(!sendDm)}
            >
              <span className="delete-request-toggle-knob" />
            </button>
          </label>

          {error && (
            <p className="delete-request-error">
              <BiIcon name="exclamation-triangle-fill" size={14} />
              {error}
            </p>
          )}
        </div>

        <div className="delete-request-modal-footer">
          <button
            type="button"
            className="delete-request-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-request-btn-confirm"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="delete-request-spinner" />
                Deleting…
              </>
            ) : (
              <>
                <BiIcon name="trash3-fill" size={16} />
                Delete Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
