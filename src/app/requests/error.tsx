"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[requests] route error:", error);
  }, [error]);

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", padding: 24, textAlign: "center" }}>
      <h1 style={{ marginBottom: 12, fontSize: 20 }}>Something went wrong</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        This page could not be loaded. You can try again or go back to requests.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          className="requests-btn-submit"
          style={{ padding: "10px 20px" }}
        >
          Try again
        </button>
        <Link href="/requests" className="requests-btn-submit" style={{ padding: "10px 20px", textDecoration: "none" }}>
          Back to requests
        </Link>
      </div>
    </div>
  );
}
