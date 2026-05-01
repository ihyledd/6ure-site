"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SuccessPopupProps = {
  planCategory: "PREMIUM" | "LEAK_PROTECTION";
  planInterval: "MONTHLY" | "YEARLY" | "LIFETIME";
  roleAssigned?: boolean;
  onClose: () => void;
};

export function SuccessPopup({ planCategory, planInterval, roleAssigned, onClose }: SuccessPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const planName = planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  const intervalLabel =
    planInterval === "MONTHLY" ? "Monthly" : planInterval === "YEARLY" ? "Yearly" : "Lifetime";

  const content = typeof document !== "undefined" && (
    <div
      className={`requests-modal-overlay membership-success-overlay ${visible ? "visible" : ""}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        zIndex: 9999,
      }}
    >
      <div
        className="requests-modal-popup membership-success-popup"
        style={{
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
          transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          background: "#111113",
          border: "1px solid rgba(87, 242, 135, 0.4)",
          boxShadow: "0 8px 32px rgba(87, 242, 135, 0.15)",
          padding: "32px",
          textAlign: "center",
          maxWidth: "440px",
        }}
      >
        <button
          className="requests-modal-close"
          onClick={handleClose}
          aria-label="Close"
          style={{ position: "absolute", top: "16px", right: "16px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div
          style={{
            width: "64px",
            height: "64px",
            background: "rgba(87, 242, 135, 0.1)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "#57F287",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="32" height="32">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ margin: "0 0 12px", fontSize: "24px", color: "#fff", fontWeight: 700 }}>
          Welcome to {planName}!
        </h2>
        <p style={{ margin: "0 0 20px", color: "#b9bbbe", lineHeight: 1.6 }}>
          You&apos;ve successfully subscribed to the <strong>{planName} {intervalLabel}</strong> plan.
        </p>

        {planCategory === "PREMIUM" ? (
          <div style={{ textAlign: "left" }}>
            {roleAssigned ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "8px", background: "rgba(87, 242, 135, 0.08)", border: "1px solid rgba(87, 242, 135, 0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#57F287" strokeWidth="2" width="18" height="18"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ color: "#57F287", fontSize: "14px" }}>Your Discord role has been granted automatically.</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px 16px", borderRadius: "8px", background: "rgba(250, 166, 26, 0.08)", border: "1px solid rgba(250, 166, 26, 0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#FAA61A" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ color: "#FAA61A", fontSize: "14px", lineHeight: 1.5 }}>Your Discord role will be assigned shortly. If you don&apos;t receive it within a few minutes, please open a ticket in our Discord server.</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "left" }}>
            {roleAssigned ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "8px", background: "rgba(87, 242, 135, 0.08)", border: "1px solid rgba(87, 242, 135, 0.2)", marginBottom: "16px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#57F287" strokeWidth="2" width="18" height="18"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ color: "#57F287", fontSize: "14px" }}>Your Discord role has been granted.</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px 16px", borderRadius: "8px", background: "rgba(250, 166, 26, 0.08)", border: "1px solid rgba(250, 166, 26, 0.2)", marginBottom: "16px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#FAA61A" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ color: "#FAA61A", fontSize: "14px", lineHeight: 1.5 }}>Your Discord role will be assigned shortly. If not, mention it when opening your ticket.</span>
              </div>
            )}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "15px", color: "#e2e2e5" }}>Next steps for Leak Protection:</h3>
              <ol style={{ margin: 0, paddingLeft: "20px", color: "#b9bbbe", fontSize: "14px", lineHeight: 1.6 }}>
                <li style={{ marginBottom: "8px" }}>Open a ticket in our Discord server.</li>
                <li style={{ marginBottom: "8px" }}>Provide your TikTok profile link and Payhip/shop link.</li>
                <li>Wait for staff to verify your subscription.</li>
              </ol>
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="membership-plan-cta membership-plan-cta-primary"
          style={{ marginTop: "24px" }}
        >
          Got it
        </button>
      </div>
    </div>
  );

  return content ? createPortal(content, document.body) : null;
}
