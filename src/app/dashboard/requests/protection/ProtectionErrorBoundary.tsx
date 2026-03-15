"use client";

import React from "react";
import Link from "next/link";

export function ProtectionErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectionErrorBoundaryInner>
      {children}
    </ProtectionErrorBoundaryInner>
  );
}

class ProtectionErrorBoundaryInner extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Protection page error]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="dashboard-card" style={{ maxWidth: 560, margin: "48px auto", padding: 24, textAlign: "center" }}>
          <h1 className="dashboard-title" style={{ marginBottom: 12, fontSize: "1.25rem" }}>
            Something went wrong on this page
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
            The Protection page could not load. You can try again or go back to the dashboard.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 24, wordBreak: "break-word" }}>
            {this.state.error.message}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="dashboard-btn dashboard-btn-primary"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
            <Link href="/dashboard/requests" className="dashboard-btn dashboard-btn-ghost">
              Back to Requests dashboard
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
