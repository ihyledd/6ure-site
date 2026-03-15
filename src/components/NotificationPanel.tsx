"use client";

import { useState } from "react";
import { BiIcon } from "./requests/BiIcon";
import { formatDate } from "@/lib/requests-utils";

/** Turn markdown-style [text](url) in notification messages into clickable links. */
function renderNotificationMessage(message: string): React.ReactNode {
  if (!message || typeof message !== "string") return message;
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(message)) !== null) {
    if (m.index > lastIndex) {
      parts.push(message.slice(lastIndex, m.index));
    }
    const linkText = (m[1] || "").replace(/\*\*/g, "").trim() || m[1];
    const url = m[2];
    parts.push(
      <a
        key={`${m.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="notification-message-link"
        onClick={(e) => e.stopPropagation()}
      >
        {linkText}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex === 0) return message;
  if (lastIndex < message.length) parts.push(message.slice(lastIndex));
  return parts;
}

type Notification = {
  id: number;
  request_id: number | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function NotificationPanel({
  notifications,
  loading,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
  isStaff,
}: {
  notifications: Notification[];
  loading: boolean;
  onClose: () => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onNotificationClick: (n: Notification) => void;
  isStaff: boolean;
}) {
  const [cancelActioning, setCancelActioning] = useState<string | null>(null);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read).slice(0, 10);

  const isCancelResolved = (n: Notification) =>
    n.type === "cancel_request" &&
    (n.title === "Cancellation approved" || n.title === "Cancellation rejected");
  const isCancelApproved = (n: Notification) =>
    n.type === "cancel_request" && n.title === "Cancellation approved";
  const isCancelRejected = (n: Notification) =>
    n.type === "cancel_request" && n.title === "Cancellation rejected";

  const handleCancelAction = async (
    e: React.MouseEvent,
    requestId: number,
    action: "approve" | "reject"
  ) => {
    e.stopPropagation();
    let body: { action: string; rejection_reason?: string } = { action };
    if (action === "reject") {
      const reason = window.prompt("Reason for rejection (required):");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("A reason is required to reject the cancellation request.");
        return;
      }
      body.rejection_reason = reason.trim();
    }
    const key = `${requestId}-${action}`;
    if (cancelActioning) return;
    setCancelActioning(key);
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel-approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const n = notifications.find(
          (nn) => nn.request_id === requestId && nn.type === "cancel_request"
        );
        if (n) onMarkRead(n.id);
      }
    } catch {
      // ignore
    } finally {
      setCancelActioning(null);
    }
  };

  const getIcon = (n: Notification) => {
    if (isCancelApproved(n)) return "check-circle-fill";
    if (isCancelRejected(n)) return "x-circle-fill";
    if (n.type === "leak") return "check-circle-fill";
    if (n.type === "cancel_request") return "x-circle-fill";
    if (n.type === "request_deleted") return "trash";
    return "exclamation-circle";
  };

  return (
    <>
      <div className="notification-overlay" onClick={onClose} aria-hidden="true" />
      <div className="notification-panel-floating" role="dialog" aria-label="Notifications">
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div className="notification-panel-actions">
            {unread.length > 0 && (
              <button
                type="button"
                className="notification-mark-all-read"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAllRead();
                }}
              >
                Mark all read
              </button>
            )}
            <button type="button" className="notification-close" onClick={onClose} aria-label="Close">
              <BiIcon name="x-lg" size={18} />
            </button>
          </div>
        </div>

        <div className="notification-panel-content">
          {loading ? (
            <div className="notification-empty">
              <BiIcon name="hourglass-split" size={32} />
              <p>Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <BiIcon name="bell" size={32} />
              <p>No notifications yet</p>
            </div>
          ) : (
            <>
              {unread.length > 0 && (
                <div className="notification-section">
                  <h4>New</h4>
                  {unread.map((n) => (
                    <NotificationItem
                      key={n.id}
                      n={n}
                      getIcon={getIcon}
                      isCancelResolved={isCancelResolved(n)}
                      isCancelApproved={isCancelApproved(n)}
                      isCancelRejected={isCancelRejected(n)}
                      isDeleted={n.type === "request_deleted"}
                      onClick={() => onNotificationClick(n)}
                      onCancelApprove={
                        isStaff &&
                        n.type === "cancel_request" &&
                        n.request_id &&
                        n.title === "Cancellation requested"
                          ? (e, action) => handleCancelAction(e, n.request_id!, action)
                          : undefined
                      }
                      cancelActioning={cancelActioning}
                    />
                  ))}
                </div>
              )}
              {read.length > 0 && (
                <div className="notification-section">
                  <h4>Earlier</h4>
                  {read.map((n) => (
                    <NotificationItem
                      key={n.id}
                      n={n}
                      getIcon={getIcon}
                      isCancelResolved={isCancelResolved(n)}
                      isCancelApproved={isCancelApproved(n)}
                      isCancelRejected={isCancelRejected(n)}
                      isDeleted={n.type === "request_deleted"}
                      onClick={() => onNotificationClick(n)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function NotificationItem({
  n,
  getIcon,
  isCancelResolved,
  isCancelApproved,
  isCancelRejected,
  isDeleted,
  onClick,
  onCancelApprove,
  cancelActioning,
}: {
  n: Notification;
  getIcon: (n: Notification) => string;
  isCancelResolved: boolean;
  isCancelApproved: boolean;
  isCancelRejected: boolean;
  isDeleted: boolean;
  onClick: () => void;
  onCancelApprove?: (e: React.MouseEvent, action: "approve" | "reject") => void;
  cancelActioning?: string | null;
}) {
  return (
    <div
      className={`notification-item ${!n.read ? "unread" : ""} ${isCancelResolved ? "notification-item-resolved" : ""} ${isCancelApproved ? "notification-item-approved" : ""} ${isCancelRejected ? "notification-item-rejected" : ""}`}
      onClick={onClick}
    >
      <div className={`notification-icon ${isCancelApproved ? "notification-icon-approved" : ""} ${isCancelRejected ? "notification-icon-rejected" : ""} ${isDeleted ? "notification-icon-deleted" : ""}`}>
        <BiIcon name={getIcon(n)} size={18} />
      </div>
      <div className="notification-body">
        <div className="notification-title-row">
          <span className="notification-title">{n.title}</span>
          {isCancelResolved && (
            <span className={`notification-status-pill ${isCancelApproved ? "notification-status-approved" : "notification-status-rejected"}`}>
              {isCancelApproved ? "Approved" : "Rejected"}
            </span>
          )}
        </div>
        <div className="notification-message">{renderNotificationMessage(n.message)}</div>
        <div className="notification-time">{formatDate(n.created_at)}</div>
        {onCancelApprove && n.request_id && (
          <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="notification-btn notification-btn-approve"
              onClick={(e) => onCancelApprove(e, "approve")}
              disabled={!!cancelActioning}
            >
              {cancelActioning === `${n.request_id}-approve` ? "..." : (
                <><BiIcon name="check" size={14} /> Approve</>
              )}
            </button>
            <button
              type="button"
              className="notification-btn notification-btn-reject"
              onClick={(e) => onCancelApprove(e, "reject")}
              disabled={!!cancelActioning}
            >
              {cancelActioning === `${n.request_id}-reject` ? "..." : (
                <><BiIcon name="x" size={14} /> Reject</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
