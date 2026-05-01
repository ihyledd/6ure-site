"use client";

import Link from "next/link";
import { useState, useRef } from "react";

type PayPalSubscribeButtonProps = {
  planCategory: "PREMIUM" | "LEAK_PROTECTION";
  planInterval: "MONTHLY" | "YEARLY" | "LIFETIME";
  promoCode?: string;
  onError: (message: string) => void;
};

export function PayPalSubscribeButton({
  planCategory,
  planInterval,
  promoCode,
  onError,
}: PayPalSubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const handleClick = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    try {
      const isLifetime = planInterval === "LIFETIME";
      const endpoint = isLifetime ? "/api/paypal/checkout-lifetime" : "/api/paypal/subscribe";
      const payload: Record<string, string> = { planCategory };
      if (!isLifetime) payload.planInterval = planInterval;
      if (promoCode) payload.promoCode = promoCode;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Failed to start checkout");
        setLoading(false);
        isSubmitting.current = false;
        return;
      }

      if (!data.approvalUrl) {
        onError("PayPal checkout URL not available. Please try again.");
        setLoading(false);
        isSubmitting.current = false;
        return;
      }

      window.location.href = data.approvalUrl;
    } catch {
      onError("Something went wrong. Please try again.");
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <>
      <button
        type="button"
        className="membership-plan-cta membership-plan-cta-primary"
        onClick={handleClick}
        disabled={loading}
        style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}
      >
        {loading ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Redirecting to PayPal...
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.645h6.922c2.291 0 3.878.574 4.713 1.706.393.533.63 1.13.707 1.776.08.674.03 1.478-.153 2.394l-.005.028v.25l.193.112c.33.178.594.385.797.624.34.4.56.902.653 1.486.096.604.063 1.303-.094 2.08-.181.892-.476 1.67-.876 2.309a4.849 4.849 0 0 1-1.394 1.467c-.55.39-1.2.678-1.927.855-.708.173-1.51.26-2.385.26H12.37a.946.946 0 0 0-.934.796l-.012.073-.567 3.593-.01.054a.946.946 0 0 1-.933.796H7.076Z" />
            </svg>
            Subscribe with PayPal
          </span>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
      <p className="membership-subscribe-legal">
        By subscribing to our membership, you agree to our{" "}
        <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
      </p>
    </>
  );
}
