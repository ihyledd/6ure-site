"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function ApplyStatusError({ message = "We couldn't load your applications. Please try again." }: { message?: string }) {
  const router = useRouter();
  return (
    <div className="apply-page">
      <div className="apply-container">
        <div className="apply-status-empty">
          <p>{message}</p>
          <div className="apply-status-actions">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="apply-status-btn apply-status-btn-primary"
            >
              Try again
            </button>
            <Link href="/" className="apply-status-btn apply-status-btn-ghost">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
