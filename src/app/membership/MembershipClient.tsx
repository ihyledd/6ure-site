"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import "@/styles/membership.css";
import Link from "next/link";

/* ---- Plan configs (client-side mirror of paypal.ts) ---- */
const PLANS = {
  PREMIUM: {
    label: "Premium",
    icon: "⭐",
    iconClass: "premium",
    description: "Access premium features and exclusive community perks.",
    features: [
      "Premium member role & badge",
      "Access to premium channels",
      "Priority support",
      "Exclusive community features",
      "Early access to new features",
    ],
    intervals: {
      MONTHLY: { price: 3, discountedPrice: null, label: "Monthly" },
      YEARLY: { price: 36, discountedPrice: 28.80, label: "Yearly", popular: true },
      LIFETIME: { price: 75, discountedPrice: null, label: "Lifetime" },
    },
  },
  LEAK_PROTECTION: {
    label: "Leak Protection",
    icon: "🛡️",
    iconClass: "lp",
    description: "Protect your content from unauthorized leaks and piracy.",
    features: [
      "Content monitoring & takedowns",
      "Leak Protection role & badge",
      "DMCA assistance",
      "Dedicated protection support",
      "Active content scanning",
    ],
    intervals: {
      MONTHLY: { price: 10, discountedPrice: null, label: "Monthly" },
      YEARLY: { price: 120, discountedPrice: 96, label: "Yearly", popular: true },
      LIFETIME: { price: 200, discountedPrice: null, label: "Lifetime" },
    },
  },
} as const;

type PlanCategory = keyof typeof PLANS;
type PlanInterval = "MONTHLY" | "YEARLY" | "LIFETIME";

export function MembershipClient() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState<string | null>(null); // "PREMIUM_MONTHLY" etc
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"premium" | "lp">("premium");
  const [modalInterval, setModalInterval] = useState<string>("MONTHLY");
  const [activeSubs, setActiveSubs] = useState<Array<{ plan_category: string; plan_interval: string; status: string }>>([]);

  // Check for success redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const category = searchParams.get("category");
    const interval = searchParams.get("interval");
    if (success === "true" && category) {
      setModalType(category === "LEAK_PROTECTION" ? "lp" : "premium");
      setModalInterval(interval ?? "MONTHLY");
      setShowModal(true);
      // clean URL
      router.replace("/membership", { scroll: false });
    }
  }, [searchParams, router]);

  // Fetch user's active subscriptions
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/subscription")
        .then((r) => r.json())
        .then((data) => {
          if (data.subscriptions) {
            setActiveSubs(data.subscriptions.filter((s: { status: string }) => s.status === "ACTIVE"));
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const hasActiveSub = useCallback(
    (category: PlanCategory) => activeSubs.some((s) => s.plan_category === category),
    [activeSubs]
  );

  // ---- Promo code ----
  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoChecking(true);
    setPromoMessage(null);
    try {
      const res = await fetch("/api/paypal/apply-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, planCategory: "PREMIUM" }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoDiscount(data.discountPercent);
        setPromoMessage({ type: "success", text: `${data.discountPercent}% discount applied!` });
      } else {
        setPromoDiscount(0);
        setPromoMessage({ type: "error", text: data.error || "Invalid code" });
      }
    } catch {
      setPromoMessage({ type: "error", text: "Failed to check code" });
    } finally {
      setPromoChecking(false);
    }
  };

  // ---- Subscribe ----
  const handleSubscribe = async (category: PlanCategory, interval: PlanInterval) => {
    if (!session?.user?.id) {
      signIn("discord", { callbackUrl: "/membership" });
      return;
    }

    const key = `${category}_${interval}`;
    setLoading(key);

    try {
      const res = await fetch("/api/paypal/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCategory: category,
          planInterval: interval,
          promoCode: promoDiscount > 0 ? promoCode : undefined,
        }),
      });

      const data = await res.json();
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Failed to process. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const getPrice = (category: PlanCategory, interval: PlanInterval) => {
    const plan = PLANS[category].intervals[interval];
    const base = plan.discountedPrice ?? plan.price;
    if (promoDiscount > 0) {
      return Math.round(base * (1 - promoDiscount / 100) * 100) / 100;
    }
    return base;
  };

  // ---- Render ----
  if (status === "loading") {
    return <div className="membership-page"><p style={{ textAlign: "center", color: "#888" }}>Loading...</p></div>;
  }

  return (
    <div className="membership-page">
      <div className="membership-hero">
        <h1>Membership</h1>
        <p>Support 6URE and unlock premium features or protect your content from unauthorized leaks.</p>
      </div>

      {/* Current subscription info */}
      {activeSubs.length > 0 && (
        <div className="current-sub-banner">
          <div className="current-sub-info">
            <h3>✓ Active Subscription{activeSubs.length > 1 ? "s" : ""}</h3>
            <p>
              {activeSubs.map((s) => {
                const planName = s.plan_category === "PREMIUM" ? "Premium" : "Leak Protection";
                const interval = s.plan_interval.charAt(0) + s.plan_interval.slice(1).toLowerCase();
                return `${planName} ${interval}`;
              }).join(", ")}
            </p>
          </div>
          <Link href="/account" className="current-sub-manage-btn">
            Manage Subscription
          </Link>
        </div>
      )}

      {status !== "authenticated" ? (
        <div className="membership-login-gate">
          <h3>Sign in to subscribe</h3>
          <p>You need to be logged in with Discord to purchase a membership plan.</p>
          <button className="membership-login-btn" onClick={() => signIn("discord", { callbackUrl: "/membership" })}>
            <svg width="20" height="15" viewBox="0 0 71 55" fill="currentColor">
              <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7c-5.5-.8-11-.8-16.4 0A37.4 37.4 0 0025.2.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.3 4.9a.2.2 0 00-.1.1C1.5 17.6-.9 29.9.3 42a.3.3 0 00.1.2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.8 41.8 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.6 2.6.2.2 0 00-.1.3 47.2 47.2 0 003.7 5.9.2.2 0 00.2.1 58.5 58.5 0 0017.7-9 .3.3 0 00.1-.2c1.4-14.5-2.4-27.1-10-38.3a.2.2 0 00-.1 0zM23.7 34.6c-3.3 0-6-3-6-6.8s2.7-6.8 6-6.8 6.1 3.1 6 6.8-2.6 6.8-6 6.8zm22.2 0c-3.3 0-6-3-6-6.8s2.7-6.8 6-6.8 6.1 3.1 6 6.8-2.6 6.8-6 6.8z" />
            </svg>
            Sign in with Discord
          </button>
        </div>
      ) : (
        <>
          {/* Premium Section */}
          {renderPlanSection("PREMIUM")}

          {/* Leak Protection Section */}
          {renderPlanSection("LEAK_PROTECTION")}

          {/* Promo Code */}
          <div className="promo-section">
            <div className="promo-input-wrap">
              <input
                type="text"
                className="promo-input"
                placeholder="Promo Code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
              />
              <button className="promo-apply-btn" onClick={applyPromo} disabled={promoChecking || !promoCode.trim()}>
                {promoChecking ? "Checking..." : "Apply"}
              </button>
            </div>
            {promoMessage && (
              <div className={`promo-message ${promoMessage.type}`}>{promoMessage.text}</div>
            )}
          </div>
        </>
      )}

      {/* Success / Instructions Modal */}
      {showModal && (
        <div className="membership-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="membership-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <div className="membership-modal-gradient" />
            <button className="membership-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="membership-modal-body">
              {modalType === "premium" ? (
                <>
                  <h2>Welcome! 🎉</h2>
                  <p>
                    You&apos;ve successfully subscribed to <strong>Premium {modalInterval.charAt(0) + modalInterval.slice(1).toLowerCase()}</strong>!
                    Your premium role has been granted automatically.
                  </p>
                  <p>Enjoy your premium features and thank you for supporting 6URE!</p>
                  <button className="membership-modal-btn" onClick={() => setShowModal(false)}>Got it!</button>
                </>
              ) : (
                <>
                  <h2>How to Get Leak Protection</h2>
                  <p>Follow these steps to complete your setup:</p>
                  <div className="instructions-steps">
                    <div className="instruction-step">
                      <span className="instruction-step-num">1</span>
                      <div className="instruction-step-content">
                        <strong>Join our Discord server</strong> if you haven&apos;t already.{" "}
                        <a href="https://discord.gg/6ure" target="_blank" rel="noreferrer">Join Discord →</a>
                      </div>
                    </div>
                    <div className="instruction-step">
                      <span className="instruction-step-num">2</span>
                      <div className="instruction-step-content">
                        <strong>Open a ticket</strong> in the server.
                      </div>
                    </div>
                    <div className="instruction-step">
                      <span className="instruction-step-num">3</span>
                      <div className="instruction-step-content">
                        <strong>Provide these in your ticket:</strong><br />
                        • Your <strong>TikTok profile link</strong><br />
                        • Your <strong>Payhip or shop link</strong> that you want to be protected
                      </div>
                    </div>
                    <div className="instruction-step">
                      <span className="instruction-step-num">4</span>
                      <div className="instruction-step-content">
                        <strong>Wait for a staff member</strong> to assist you with more information.
                      </div>
                    </div>
                  </div>
                  <div className="instructions-warning">
                    <p>⚠️ <strong>Note:</strong> We reserve the right to refuse service if you violate our server & Discord rules. In such cases, you will receive a full refund.</p>
                  </div>
                  <button className="membership-modal-btn" onClick={() => setShowModal(false)} style={{ marginTop: 16 }}>Got it!</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderPlanSection(category: PlanCategory) {
    const planConfig = PLANS[category];
    const isActive = hasActiveSub(category);

    return (
      <section className="membership-section">
        <div className="membership-section-title">
          <div className={`membership-section-icon ${planConfig.iconClass}`}>{planConfig.icon}</div>
          <div>
            <h2>{planConfig.label}</h2>
            <p>{planConfig.description}</p>
          </div>
        </div>

        <div className="membership-plans">
          {(Object.entries(planConfig.intervals) as [PlanInterval, typeof planConfig.intervals[PlanInterval]][]).map(
            ([interval, config]) => {
              const isPopular = "popular" in config && config.popular;
              const finalPrice = getPrice(category, interval);
              const originalPrice = PLANS[category].intervals[interval].price;
              const hasDiscount = finalPrice < originalPrice;
              const savings = hasDiscount ? originalPrice - finalPrice : 0;
              const loadKey = `${category}_${interval}`;
              const isLoading = loading === loadKey;

              return (
                <div key={interval} className={`plan-card ${isPopular ? "popular" : ""}`}>
                  {isPopular && <div className="plan-card-badge">Most Popular</div>}
                  <div className="plan-card-interval">{config.label}</div>
                  <div className="plan-card-price">
                    {hasDiscount && <span className="price-original">${originalPrice}</span>}
                    <span className="price-amount">${finalPrice.toFixed(2)}</span>
                    <span className="price-period">
                      {interval === "LIFETIME" ? " one-time" : interval === "YEARLY" ? "/year" : "/month"}
                    </span>
                  </div>
                  {hasDiscount && (
                    <div className="plan-card-savings">Save ${savings.toFixed(2)}</div>
                  )}
                  <ul className="plan-card-features">
                    {planConfig.features.map((f, i) => (
                      <li key={i}>
                        <span className="feature-check">✓</span> {f}
                      </li>
                    ))}
                    {interval === "LIFETIME" && (
                      <li>
                        <span className="feature-check">✓</span> <strong>Lifetime access — pay once!</strong>
                      </li>
                    )}
                  </ul>

                  {isActive ? (
                    <div className="plan-active-badge">✓ Active</div>
                  ) : (
                    <button
                      className={`plan-subscribe-btn ${isPopular ? "primary" : "secondary"}`}
                      onClick={() => handleSubscribe(category, interval)}
                      disabled={isLoading || loading !== null}
                    >
                      {isLoading ? <span className="btn-spinner" /> : "Subscribe"}
                    </button>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>
    );
  }
}
