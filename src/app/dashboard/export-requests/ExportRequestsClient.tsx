"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ExportRequestRow {
  id: string;
  userId: string;
  username: string | null;
  status: string;
  createdAt: Date | string;
  completedAt: Date | string | null;
  downloadUrl: string | null;
}

export function ExportRequestsClient({ requests }: { requests: ExportRequestRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  async function markCompleted(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/export-requests/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="dashboard-list-plain">
      {requests.map((req) => (
        <li key={req.id} className="dashboard-card dashboard-card-app" style={{ marginBottom: 12 }}>
          <div className="dashboard-card-title" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>
              {req.username || "Unknown"} (Discord ID: {req.userId})
            </span>
            <span className={`dashboard-badge ${req.status === "PENDING" ? "dashboard-badge-pending" : req.status === "COMPLETED" ? "dashboard-badge-green" : "dashboard-badge-muted"}`}>
              {req.status}
            </span>
          </div>
          <p className="dashboard-card-desc" style={{ margin: "4px 0 0" }}>
            Request ID: {req.id}
          </p>
          {req.downloadUrl && (
            <p className="dashboard-card-desc" style={{ marginTop: 4 }}>
              <a href={req.downloadUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--discord-blurple)" }}>
                Download link
              </a>
            </p>
          )}
          <p className="dashboard-card-desc" style={{ marginTop: 4 }} suppressHydrationWarning>
            Created: {toDate(req.createdAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })}
          </p>
          {req.status === "PENDING" && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="dashboard-btn dashboard-btn-primary dashboard-btn-sm"
                onClick={() => markCompleted(req.id)}
                disabled={loadingId === req.id}
              >
                {loadingId === req.id ? "…" : "Mark as completed"}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
