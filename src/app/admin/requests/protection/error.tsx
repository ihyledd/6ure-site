"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProtectionRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(true);
  useEffect(() => {
    console.error("[Protection route] error:", error);
  }, [error]);

  return (
    <div className="dashboard-card" style={{ maxWidth: 560, margin: "48px auto", padding: 24, textAlign: "center" }}>
      <h1 className="dashboard-title" style={{ marginBottom: 12, fontSize: "1.25rem" }}>
        Protection page error
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
        This page could not be loaded. Please try again or go back to the dashboard.
      </p>
      <div style={{ marginBottom: 24, textAlign: "left" }}>
        <button
          type="button"
          onClick={() => setShowDetails((d) => !d)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {showDetails ? "Hide" : "Show"} error details
        </button>
        {showDetails && (
          <pre
            style={{
              marginTop: 8,
              padding: 12,
              background: "var(--bg-secondary, rgba(0,0,0,0.2))",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              overflow: "auto",
              maxHeight: 280,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.digest ? `\n\n(digest: ${error.digest})` : ""}
          </pre>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/admin/requests" className="dashboard-btn dashboard-btn-ghost">
          Back to Requests
        </Link>
      </div>
    </div>
  );
}
