"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BiIcon } from "./requests/BiIcon";
import { NotificationPanel } from "./NotificationPanel";

type Notification = {
  id: number;
  request_id: number | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function FloatingNotifications() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = () => {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.user?.id) loadNotifications();
    else setNotifications([]);
  }, [session?.user?.id]);

  useEffect(() => {
    if (isOpen && session?.user?.id) loadNotifications();
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.type === "request_deleted") {
      setIsOpen(false);
      return;
    }
    if (n.request_id) {
      router.push(`/requests/request/${n.request_id}`);
      setIsOpen(false);
    }
  };

  if (status !== "authenticated" || !session?.user) return null;

  return (
    <>
      <button
        type="button"
        className="wiki-floating-notifications"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        title="Notifications"
      >
        <BiIcon name="bell-fill" size={20} />
        {unreadCount > 0 && (
          <span className="floating-notifications-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          onClose={() => setIsOpen(false)}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onNotificationClick={handleNotificationClick}
          isStaff={(session.user as { role?: string }).role === "ADMIN"}
        />
      )}
    </>
  );
}
