"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import "@/styles/membership.css";

const PLANS = {
  PREMIUM: {
    label: "Premium",
    icon: "⭐",
    iconClass: "premium",
    features: [
      "Priority request queue",
      "Access to premium leaks",
      "Exclusive Discord role",
      "No ads experience",
      "Early access to features",
    ],
    intervals: [
      { key: "MONTHLY", label: "Monthly", price: 3, originalPrice: null as number | null, savings: null as string | null },
      { key: "YEARLY", label: "Yearly", price: 28.8, originalPrice: 36, savings: "Save 20%" },
      { key: "LIFETIME", label: "Lifetime", price: 75, originalPrice: null as number | null, savings: "Pay once, keep forever" },
    ],
  },
  LEAK_PROTECTION: {
    label: "Leak Protection",
    icon: "🛡️",
    iconClass: "lp",
    features: [
      "Active DMCA monitoring",
      "Content takedown support",
      "Priority leak response",
      "Dedicated support ticket",
      "Coverage for TikTok & Payhip",
    ],
    intervals: [
      { key: "MONTHLY", label: "Monthly", price: 10, originalPrice: null as number | null, savings: null as string | null },
      { key: "YEARLY", label: "Yearly", price: 96, originalPrice: 120, savings: "Save 20%" },
      { key: "LIFETIME", label: "Lifetime", price: 200, originalPrice: null as number | null, savings: "Pay once, lifetime coverage" },
    ],
  },
};

type SessionUser = {
  id?: string;
  patreon_premium?: boolean;
  leak_protection?: boolean;
};

export function MembershipClient() {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | undefined;
  const searchParams = useSearchParams();

  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Post-payment modals
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const success = searchParams?.get("success");
    const category = searchParams?.get("category");
    const interval = searchParams?.get("interval");
    if (success === "true" && category) {
      if (category === "PREMIUM") setShowWelcome(true);
      if (category === "LEAK_PROTECTION") setShowInstructions(true);
      // Clean URL
      window.history.replaceState({}, "", "/membership");
    }
  }, [searchParams]);

  // Check existing active subs
  const [activeSubs, setActiveSubs] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/user/subscription").then(r => r.json()).then(data => {
      const active = (data.subscriptions ?? []).filter((s: { status: string }) => s.status === "ACTIVE").map((s: { plan_category: string }) => s.plan_category);
      setActiveSubs(active);
    }).catch(() => {});
  }, [user?.id]);

  const applyPromo = useCallback(async () => {
    if (!promoCode) return;
    try {
      const res = await fetch("/api/paypal/apply-promo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
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
      setPromoMessage({ type: "error", text: "Failed to validate code" });
    }
  }, [promoCode]);

  const subscribe = useCallback(async (planCategory: string, planInterval: string) => {
    const key = `${planCategory}_${planInterval}`;
    setSubscribing(key);
    try {
      const res = await fetch("/api/paypal/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCategory, planInterval, promoCode: promoDiscount > 0 ? promoCode : undefined }),
      });
      const data = await res.json();
      if (data.approvalUrl) window.location.href = data.approvalUrl;
      else alert(data.error || "Failed to create subscription");
    } catch { alert("Something went wrong"); }
    finally { setSubscribing(null); }
  }, [promoCode, promoDiscount]);

  const calcPrice = (basePrice: number) => {
    if (promoDiscount <= 0) return basePrice;
    return Math.round(basePrice * (1 - promoDiscount / 100) * 100) / 100;
  };

  const isLoggedIn = status === "authenticated" && user?.id;

  return (
    <div className="membership-page">
      <div className="membership-hero">
        <h1>Membership</h1>
        <p>Choose a plan to unlock exclusive features and support 6URE.</p>
      </div>

      {/* Active subscription banner */}
      {isLoggedIn && (user?.patreon_premium || activeSubs.includes("PREMIUM")) && (
        <div className="current-sub-banner">
          <div className="current-sub-info">
            <h3>✓ Premium Active</h3>
            <p>You have an active Premium subscription.</p>
          </div>
          <Link href="/account" className="current-sub-manage-btn">Manage</Link>
        </div>
      )}
      {isLoggedIn && (user?.leak_protection || activeSubs.includes("LEAK_PROTECTION")) && (
        <div className="current-sub-banner">
          <div className="current-sub-info">
            <h3>✓ Leak Protection Active</h3>
            <p>Your content is being protected.</p>
          </div>
          <Link href="/account" className="current-sub-manage-btn">Manage</Link>
        </div>
      )}

      {/* Plan sections */}
      {Object.entries(PLANS).map(([catKey, cat]) => (
        <div key={catKey} className="membership-section">
          <div className="membership-section-title">
            <div className={`membership-section-icon ${cat.iconClass}`}>{cat.icon}</div>
            <div>
              <h2>{cat.label}</h2>
              <p>{catKey === "PREMIUM" ? "Unlock premium features and benefits" : "Protect your content from unauthorized distribution"}</p>
            </div>
          </div>
          <div className="membership-plans">
            {cat.intervals.map((intv) => {
              const isActive = activeSubs.includes(catKey);
              const isPopular = intv.key === "YEARLY";
              const finalPrice = calcPrice(intv.price);
              const subKey = `${catKey}_${intv.key}`;

              return (
                <div key={intv.key} className={`plan-card ${isPopular ? "popular" : ""}`}>
                  {isPopular && <div className="plan-card-badge">Most Popular</div>}
                  <div className="plan-card-interval">{intv.label}</div>
                  <div className="plan-card-price">
                    {intv.originalPrice && <span className="price-original">${intv.originalPrice}</span>}
                    {promoDiscount > 0 && <span className="price-original">${intv.price}</span>}
                    <span className="price-amount">${finalPrice.toFixed(2)}</span>
                    <span className="price-period">{intv.key === "LIFETIME" ? " one-time" : intv.key === "YEARLY" ? "/year" : "/month"}</span>
                  </div>
                  {intv.savings && <div className="plan-card-savings">{intv.savings}</div>}
                  <ul className="plan-card-features">
                    {cat.features.map((f, i) => (
                      <li key={i}><span className="feature-check">✓</span> {f}</li>
                    ))}
                  </ul>
                  {isActive ? (
                    <div className="plan-active-badge">✓ Active</div>
                  ) : isLoggedIn ? (
                    <button
                      className={`plan-subscribe-btn ${isPopular ? "primary" : "secondary"}`}
                      disabled={subscribing === subKey}
                      onClick={() => subscribe(catKey, intv.key)}
                    >
                      {subscribing === subKey ? <span className="btn-spinner" /> : "Subscribe"}
                    </button>
                  ) : (
                    <button className="plan-subscribe-btn secondary" onClick={() => signIn("discord")}>
                      Login to Subscribe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Promo code */}
      <div className="promo-section">
        <div className="promo-input-wrap">
          <input className="promo-input" placeholder="PROMO CODE" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
          <button className="promo-apply-btn" onClick={applyPromo} disabled={!promoCode}>Apply</button>
        </div>
        {promoMessage && <div className={`promo-message ${promoMessage.type}`}>{promoMessage.text}</div>}
      </div>

      {/* Login gate for visitors */}
      {!isLoggedIn && status !== "loading" && (
        <div className="membership-login-gate">
          <h3>Sign in to Subscribe</h3>
          <p>Connect your Discord account to get started.</p>
          <button className="membership-login-btn" onClick={() => signIn("discord")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/></svg>
            Login with Discord
          </button>
        </div>
      )}

      {/* Welcome modal (Premium) */}
      {showWelcome && (
        <div className="membership-modal-overlay" onClick={() => setShowWelcome(false)}>
          <div className="membership-modal" onClick={(e) => e.stopPropagation()}>
            <div className="membership-modal-gradient" />
            <button className="membership-modal-close" onClick={() => setShowWelcome(false)}>✕</button>
            <div className="membership-modal-body">
              <h2>🎉 Welcome to Premium!</h2>
              <p>Your Premium subscription is now active. You have access to all premium features including priority requests, exclusive leaks, and an ad-free experience.</p>
              <p>Your Discord role will be updated shortly. Enjoy!</p>
              <button className="membership-modal-btn" onClick={() => setShowWelcome(false)}>Got it!</button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions modal (Leak Protection) */}
      {showInstructions && (
        <div className="membership-modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="membership-modal" onClick={(e) => e.stopPropagation()}>
            <div className="membership-modal-gradient" />
            <button className="membership-modal-close" onClick={() => setShowInstructions(false)}>✕</button>
            <div className="membership-modal-body">
              <h2>🛡️ Leak Protection — Setup</h2>
              <p>Thank you for subscribing! Follow these steps to complete your setup:</p>
              <div className="instructions-steps">
                <div className="instruction-step">
                  <div className="instruction-step-num">1</div>
                  <div className="instruction-step-content">
                    <strong>Join our Discord server</strong> if you haven&apos;t already — <a href="https://discord.gg/6ureleaks" target="_blank" rel="noopener noreferrer">discord.gg/6ureleaks</a>
                  </div>
                </div>
                <div className="instruction-step">
                  <div className="instruction-step-num">2</div>
                  <div className="instruction-step-content">
                    <strong>Open a ticket</strong> in the appropriate channel.
                  </div>
                </div>
                <div className="instruction-step">
                  <div className="instruction-step-num">3</div>
                  <div className="instruction-step-content">
                    Provide your <strong>TikTok profile link</strong> and <strong>Payhip or shop link</strong> that you want protected.
                  </div>
                </div>
                <div className="instruction-step">
                  <div className="instruction-step-num">4</div>
                  <div className="instruction-step-content">
                    A staff member will assist you with the rest of the setup.
                  </div>
                </div>
              </div>
              <div className="instructions-warning">
                <p>⚠️ We reserve the right to refuse service if you violate our server &amp; Discord rules. In such cases, you will receive a full refund.</p>
              </div>
              <button className="membership-modal-btn" onClick={() => setShowInstructions(false)}>Understood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
