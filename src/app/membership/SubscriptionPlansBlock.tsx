"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { MarkdownProse } from "@/components/Markdown";
import { PLAN_PRICES } from "@/lib/pricing";
import { getDiscordLoginUrl } from "@/lib/auth-urls";
import { PayPalSubscribeButton } from "./PayPalSubscribeButton";
import { SuccessPopup } from "./SuccessPopup";

type SubInfo = { id: string; category: string; interval: string };

type SubscriptionPlansBlockProps = {
  /** Same OAuth URL as header login; fallback uses getDiscordLoginUrl if omitted. */
  discordLoginUrl?: string;
  settings: Record<string, string>;
  isPremium: boolean;
  isLeakProtection: boolean;
  rolePremium?: boolean;
  roleLP?: boolean;
  premiumSub?: SubInfo | null;
  lpSub?: SubInfo | null;
  discordUrl?: string;
  isAuthenticated?: boolean;
  statusParam?: string;
  messageParam?: string;
  planParam?: "PREMIUM" | "LEAK_PROTECTION";
  intervalParam?: "MONTHLY" | "YEARLY" | "LIFETIME";
};

type PromoState = {
  code: string;
  discount: number;
  status: "applied" | "error" | "idle";
  message: string;
  /** From DB: promo only applies to this plan; null/undefined = all plans */
  restrictedPlan?: "PREMIUM" | "LEAK_PROTECTION" | null;
};

function parseFeaturesJson(raw: string | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function getCurrentPlanCard(isPremium: boolean, isLeakProtection: boolean): "basic" | "premium" | "leak_protection" | null {
  if (isLeakProtection) return "leak_protection";
  if (isPremium) return "premium";
  return "basic";
}

function applyDiscount(price: number, discountPercent: number): number {
  return Math.max(0.01, price * (1 - discountPercent / 100));
}

function promoPercentForPlan(
  restricted: "PREMIUM" | "LEAK_PROTECTION" | null | undefined,
  plan: "PREMIUM" | "LEAK_PROTECTION",
  discountPercent: number
): number {
  if (!discountPercent) return 0;
  if (restricted == null || restricted === undefined) return discountPercent;
  return restricted === plan ? discountPercent : 0;
}


export function SubscriptionPlansBlock({
  discordLoginUrl,
  settings,
  isPremium,
  isLeakProtection,
  rolePremium = false,
  roleLP = false,
  premiumSub = null,
  lpSub = null,
  isAuthenticated = false,
  statusParam,
  messageParam,
  planParam,
  intervalParam,
}: SubscriptionPlansBlockProps) {
  const [billing, setBilling] = useState<"monthly" | "annual" | "lifetime">("monthly");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [successPlan, setSuccessPlan] = useState<{ category: string; interval: string; roleAssigned: boolean } | null>(
    statusParam === "success" && planParam && intervalParam
      ? { category: planParam, interval: intervalParam, roleAssigned: true }
      : null
  );

  const hasSubPremium = !!premiumSub;
  const hasSubLP = !!lpSub;

  const handleSwitchPlan = async (sub: SubInfo) => {
    const intervalLabel = sub.interval === "YEARLY" ? "Yearly" : sub.interval === "LIFETIME" ? "Lifetime" : "Monthly";
    const categoryLabel = sub.category === "PREMIUM" ? "Premium" : "Leak Protection";
    const ok = window.confirm(
      `This will cancel your current ${categoryLabel} (${intervalLabel}) subscription.\n\nAfter cancellation, you can subscribe to a different plan.`
    );
    if (!ok) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: sub.id, intent: "switch" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel subscription");
      }
      window.location.reload();
    } catch (e) {
      setErrorBanner((e as Error).message);
      setSwitching(false);
    }
  };

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promo, setPromo] = useState<PromoState>({ code: "", discount: 0, status: "idle", message: "", restrictedPlan: null });

  const currentPlan = useMemo(() => getCurrentPlanCard(isPremium, isLeakProtection), [isPremium, isLeakProtection]);

  useEffect(() => {
    if (statusParam === "success" && planParam && intervalParam) {
      setSuccessPlan({ category: planParam, interval: intervalParam, roleAssigned: true });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusParam === "error") {
      setErrorBanner(`Payment failed: ${messageParam || "Unknown error"}`);
    }
  }, [statusParam, messageParam, planParam, intervalParam]);

  useEffect(() => {
    if (errorBanner) {
      const t = setTimeout(() => setErrorBanner(null), 8000);
      return () => clearTimeout(t);
    }
  }, [errorBanner]);

  useEffect(() => {
    if (billing !== "monthly" && promo.status === "applied") {
      setPromo({ code: "", discount: 0, status: "idle", message: "", restrictedPlan: null });
      setPromoInput("");
    }
  }, [billing, promo.status]);

  const handlePaymentError = useCallback((message: string) => {
    setErrorBanner(message);
  }, []);

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    try {
      const planInterval =
        billing === "annual" ? "YEARLY" : billing === "lifetime" ? "LIFETIME" : "MONTHLY";
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planInterval }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromo({
          code,
          discount: data.discount,
          status: "applied",
          message: `${data.discount}% off applied!`,
          restrictedPlan: (data.planCategory as "PREMIUM" | "LEAK_PROTECTION" | null | undefined) ?? null,
        });
      } else {
        setPromo({ code: "", discount: 0, status: "error", message: data.error || "Invalid promo code", restrictedPlan: null });
      }
    } catch {
      setPromo({ code: "", discount: 0, status: "error", message: "Failed to validate code", restrictedPlan: null });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromo({ code: "", discount: 0, status: "idle", message: "", restrictedPlan: null });
    setPromoInput("");
  };

  const heroTitle = settings.hero_title ?? "Choose your membership";
  const heroSubtitle = settings.hero_subtitle ?? "";

  const basicTitle = settings.basic_card_title ?? "Basic";

  const premiumTitle = settings.premium_card_title ?? "Premium";
  const premiumLabel = settings.premium_card_label ?? "";
  const premiumFeatures = useMemo(() => parseFeaturesJson(settings.premium_features), [settings.premium_features]);

  const protectionTitle = settings.protection_card_title ?? "Leak Protection";
  const protectionLabel = settings.protection_card_label ?? "";
  const protectionFeatures = useMemo(() => parseFeaturesJson(settings.protection_features), [settings.protection_features]);

  const baseDiscount = promo.status === "applied" && billing === "monthly" ? promo.discount : 0;
  const discountPremium = promoPercentForPlan(promo.restrictedPlan, "PREMIUM", baseDiscount);
  const discountProtection = promoPercentForPlan(promo.restrictedPlan, "LEAK_PROTECTION", baseDiscount);

  const prices = {
    monthly: {
      premium: discountPremium ? applyDiscount(PLAN_PRICES.PREMIUM.MONTHLY.price, discountPremium) : PLAN_PRICES.PREMIUM.MONTHLY.price,
      protection: discountProtection ? applyDiscount(PLAN_PRICES.LEAK_PROTECTION.MONTHLY.price, discountProtection) : PLAN_PRICES.LEAK_PROTECTION.MONTHLY.price,
    },
    annual: {
      premium: discountPremium ? applyDiscount(PLAN_PRICES.PREMIUM.YEARLY.price, discountPremium) : PLAN_PRICES.PREMIUM.YEARLY.price,
      protection: discountProtection ? applyDiscount(PLAN_PRICES.LEAK_PROTECTION.YEARLY.price, discountProtection) : PLAN_PRICES.LEAK_PROTECTION.YEARLY.price,
    },
    lifetime: {
      premium: discountPremium ? applyDiscount(PLAN_PRICES.PREMIUM.LIFETIME.price, discountPremium) : PLAN_PRICES.PREMIUM.LIFETIME.price,
      protection: discountProtection ? applyDiscount(PLAN_PRICES.LEAK_PROTECTION.LIFETIME.price, discountProtection) : PLAN_PRICES.LEAK_PROTECTION.LIFETIME.price,
    },
  };

  const originalPrices = {
    monthly: { premium: PLAN_PRICES.PREMIUM.MONTHLY.price, protection: PLAN_PRICES.LEAK_PROTECTION.MONTHLY.price },
    annual: { premium: PLAN_PRICES.PREMIUM.YEARLY.price, protection: PLAN_PRICES.LEAK_PROTECTION.YEARLY.price },
    lifetime: { premium: PLAN_PRICES.PREMIUM.LIFETIME.price, protection: PLAN_PRICES.LEAK_PROTECTION.LIFETIME.price },
  };

  const yearlyFullPrices = {
    premium: PLAN_PRICES.PREMIUM.MONTHLY.price * 12,
    protection: PLAN_PRICES.LEAK_PROTECTION.MONTHLY.price * 12,
  };

  const getPlanInterval = (): "MONTHLY" | "YEARLY" | "LIFETIME" => {
    if (billing === "annual") return "YEARLY";
    if (billing === "lifetime") return "LIFETIME";
    return "MONTHLY";
  };

  const activePromoCode = promo.status === "applied" ? promo.code : undefined;
  const promoCodeForPremium = activePromoCode && discountPremium > 0 ? activePromoCode : undefined;
  const promoCodeForProtection = activePromoCode && discountProtection > 0 ? activePromoCode : undefined;

  return (
    <>
      {errorBanner && (
        <div className="membership-error-banner" role="alert">
          <span>{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner(null)} aria-label="Dismiss" className="membership-error-banner-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <section className="protected-hero membership-hero">
        <h1>{heroTitle}</h1>
        {heroSubtitle && (
          <div className="protected-hero-subtitle membership-hero-subtitle">
            <MarkdownProse content={heroSubtitle} className="membership-hero-subtitle-prose" />
          </div>
        )}
        <div className="membership-hero-social-proof">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Join 100+ members enjoying premium perks
        </div>
      </section>

      <div className="membership-current-plan-wrap">
        <div className="membership-current-plan-card">
          <span className="membership-current-plan-label">Your current plan:</span>
          {isLeakProtection && isPremium ? (
            <div className="membership-current-plan-pills" aria-label="Current plans: Premium and Leak Protection">
              <span className="membership-current-plan-pill">{premiumTitle}</span>
              <span className="membership-current-plan-pill membership-current-plan-pill-accent">{protectionTitle}</span>
            </div>
          ) : (
            <strong className="membership-current-plan-value">
              {currentPlan === "leak_protection"
                ? protectionTitle
                : currentPlan === "premium"
                  ? premiumTitle
                  : basicTitle}
            </strong>
          )}
          {isAuthenticated && (hasSubPremium || hasSubLP) && (
            <Link href="/requests/account" className="membership-plan-cta-small" style={{ marginLeft: "auto" }}>
              Manage Subscription
            </Link>
          )}
        </div>
      </div>

      <div className="membership-billing-toggle-wrap">
        <div className="membership-billing-toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`protected-filter-pill ${billing === "monthly" ? "active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`protected-filter-pill ${billing === "annual" ? "active" : ""}`}
            onClick={() => setBilling("annual")}
          >
            Yearly <span className="membership-billing-badge membership-billing-badge-green">Save 20%</span>
          </button>
          <button
            type="button"
            className={`protected-filter-pill ${billing === "lifetime" ? "active" : ""}`}
            onClick={() => setBilling("lifetime")}
          >
            Lifetime <span className="membership-billing-badge membership-billing-badge-blurple">Best Value</span>
          </button>
        </div>
      </div>

      {/* Promo Code Section */}
      {isAuthenticated && (
        <div className="membership-promo-wrap">
          <div className="membership-promo-card">
            <div className="membership-promo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            {promo.status === "applied" ? (
              <div className="membership-promo-applied-row">
                <div className="membership-promo-applied-info">
                  <span className="membership-promo-applied-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {promo.code}
                  </span>
                  <span className="membership-promo-applied-text">{promo.message}</span>
                </div>
                <button type="button" className="membership-promo-remove-btn" onClick={handleRemovePromo}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="membership-promo-input-row">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); if (promo.status === "error") setPromo({ ...promo, status: "idle", message: "" }); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromo(); }}
                  placeholder="Enter promo code"
                  className="membership-promo-input"
                  maxLength={32}
                  disabled={promoLoading}
                />
                <button
                  type="button"
                  className="membership-promo-apply-btn"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                >
                  {promoLoading ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  ) : "Apply"}
                </button>
              </div>
            )}
            {promo.status === "error" && promo.message && (
              <div className="membership-promo-error">{promo.message}</div>
            )}
          </div>
        </div>
      )}

      <div className="membership-plans-grid">
        {/* Basic */}
        <div className={`membership-plan-card ${currentPlan === "basic" ? "membership-plan-current" : ""}`}>
          <div className="membership-plan-card-inner">
            <h2 className="membership-plan-title">{basicTitle}</h2>
            <div className="membership-plan-price-row">
              <span className="membership-plan-price">$0</span>
              <span className="membership-plan-period">/ Per user / Lifetime Access</span>
            </div>
            <span className={`membership-plan-cta membership-plan-cta-current ${currentPlan !== "basic" ? "membership-plan-cta-muted" : ""}`}>
              {currentPlan === "basic" ? "Current Plan" : "Included"}
            </span>
          </div>
        </div>

        {/* Premium */}
        <div className={`membership-plan-card membership-plan-featured ${currentPlan === "premium" ? "membership-plan-current" : ""}`}>
          <div className="membership-plan-card-inner">
            <h2 className="membership-plan-title">{premiumTitle}</h2>
            {premiumLabel && <p className="membership-plan-label">{premiumLabel}</p>}
            <div className="membership-plan-price-row">
              {billing === "annual" && (
                <span className="membership-plan-old-price">${yearlyFullPrices.premium.toFixed(2)}</span>
              )}
              {discountPremium > 0 && billing !== "annual" && (
                <span className="membership-plan-old-price">${originalPrices[billing].premium.toFixed(2)}</span>
              )}
              <span className="membership-plan-price">${prices[billing].premium.toFixed(2)}</span>
              <span className="membership-plan-period">/ Per user / {billing === "annual" ? "Year" : billing === "lifetime" ? "Lifetime Access" : "Month"}</span>
              {discountPremium > 0 && <span className="membership-plan-save">{discountPremium}% off</span>}
              {billing === "annual" && <span className="membership-plan-save">Save ${(yearlyFullPrices.premium - prices.annual.premium).toFixed(2)}/year</span>}
            </div>

            {isAuthenticated ? (
              hasSubPremium ? (
                <div className="membership-plan-cta-group">
                  <span className="membership-plan-cta membership-plan-cta-current">Current Plan</span>
                  <button
                    type="button"
                    className="membership-switch-plan-link"
                    onClick={() => handleSwitchPlan(premiumSub!)}
                    disabled={switching}
                  >
                    {switching ? "Cancelling..." : "Switch Plan"}
                  </button>
                </div>
              ) : (
                <div className="membership-plan-cta-group">
                  {rolePremium && (
                    <span className="membership-role-badge">Active via Role</span>
                  )}
                  <PayPalSubscribeButton
                    planCategory="PREMIUM"
                    planInterval={getPlanInterval()}
                    promoCode={promoCodeForPremium}
                    onError={handlePaymentError}
                  />
                </div>
              )
            ) : (
              <a href={discordLoginUrl ?? getDiscordLoginUrl("/membership")} className="membership-plan-cta membership-plan-cta-primary">
                Login to Subscribe
              </a>
            )}

            {premiumFeatures.length > 0 && (
              <ul className="membership-plan-features">
                {premiumFeatures.map((text, i) => (
                  <li key={i}>
                    <MarkdownProse content={text} inline className="membership-plan-feature-text" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Leak Protection */}
        <div className={`membership-plan-card ${currentPlan === "leak_protection" ? "membership-plan-current" : ""}`}>
          <div className="membership-plan-card-inner">
            <h2 className="membership-plan-title">{protectionTitle}</h2>
            {protectionLabel && <p className="membership-plan-label">{protectionLabel}</p>}
            <div className="membership-plan-price-row">
              {billing === "annual" && (
                <span className="membership-plan-old-price">${yearlyFullPrices.protection.toFixed(2)}</span>
              )}
              {discountProtection > 0 && billing !== "annual" && (
                <span className="membership-plan-old-price">${originalPrices[billing].protection.toFixed(2)}</span>
              )}
              <span className="membership-plan-price">${prices[billing].protection.toFixed(2)}</span>
              <span className="membership-plan-period">/ Per user / {billing === "annual" ? "Year" : billing === "lifetime" ? "Lifetime Access" : "Month"}</span>
              {discountProtection > 0 && <span className="membership-plan-save">{discountProtection}% off</span>}
              {billing === "annual" && <span className="membership-plan-save">Save ${(yearlyFullPrices.protection - prices.annual.protection).toFixed(2)}/year</span>}
            </div>

            {isAuthenticated ? (
              hasSubLP ? (
                <div className="membership-plan-cta-group">
                  <span className="membership-plan-cta membership-plan-cta-current">Current Plan</span>
                  <button
                    type="button"
                    className="membership-switch-plan-link"
                    onClick={() => handleSwitchPlan(lpSub!)}
                    disabled={switching}
                  >
                    {switching ? "Cancelling..." : "Switch Plan"}
                  </button>
                </div>
              ) : (
                <div className="membership-plan-cta-group">
                  {roleLP && (
                    <span className="membership-role-badge">Active via Role</span>
                  )}
                  <PayPalSubscribeButton
                    planCategory="LEAK_PROTECTION"
                    planInterval={getPlanInterval()}
                    promoCode={promoCodeForProtection}
                    onError={handlePaymentError}
                  />
                </div>
              )
            ) : (
              <a href={discordLoginUrl ?? getDiscordLoginUrl("/membership")} className="membership-plan-cta membership-plan-cta-primary">
                Login to Subscribe
              </a>
            )}

            {protectionFeatures.length > 0 && (
              <ul className="membership-plan-features">
                {protectionFeatures.map((text, i) => (
                  <li key={i}>
                    <MarkdownProse content={text} inline className="membership-plan-feature-text" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="membership-compare-container">
        <div className="membership-compare-header">
          <h2 className="membership-compare-title">Compare Features</h2>
          <p className="membership-compare-subtitle">See exactly what you get with Premium.</p>
        </div>
        <div className="membership-table-responsive">
          <table className="membership-table">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Feature</th>
                <th style={{ width: "25%" }}>Basic</th>
                <th className="membership-table-highlight" style={{ width: "25%" }}>Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Preset Access</td>
                <td className="membership-table-muted">Password required via Linkvertise (can take 1 hr)</td>
                <td className="membership-table-strong">Instant Access (No Ads)</td>
              </tr>
              <tr>
                <td>Requests per day</td>
                <td className="membership-table-muted">2 normal requests</td>
                <td className="membership-table-strong">Up to 4 Priority Requests</td>
              </tr>
              <tr>
                <td>Giveaway Entries</td>
                <td className="membership-table-muted">1x Entry</td>
                <td className="membership-table-strong">2x Entries</td>
              </tr>
              <tr>
                <td>Premium Leaks</td>
                <td className="membership-table-muted">❌</td>
                <td className="membership-table-strong">✅</td>
              </tr>
              <tr>
                <td>Exclusive Discord Role & Access</td>
                <td className="membership-table-muted">❌</td>
                <td className="membership-table-strong">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="membership-faq-container">
        <h2 className="membership-faq-title">Frequently Asked Questions</h2>
        <div className="membership-faq-list">
          <details className="membership-faq-item">
            <summary>What is your refund policy?</summary>
            <div className="membership-faq-content">
              <p>We offer refunds under the following conditions:</p>
              <div className="membership-table-responsive" style={{ marginBottom: "16px" }}>
                <table className="membership-table membership-table-sm">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Eligible</th>
                      <th>Timeframe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Perks do not function as described</td>
                      <td>Yes</td>
                      <td>14 days</td>
                    </tr>
                    <tr>
                      <td>Accidental duplicate purchase</td>
                      <td>Yes</td>
                      <td>14 days</td>
                    </tr>
                    <tr>
                      <td>Change of mind</td>
                      <td>Case by case</td>
                      <td>48 hours</td>
                    </tr>
                    <tr>
                      <td>Perks already used</td>
                      <td>No</td>
                      <td>--</td>
                    </tr>
                    <tr>
                      <td>Violation of Terms</td>
                      <td>No</td>
                      <td>--</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                To request a refund, contact us at <strong>contact@6ureleaks.com</strong> with your payment details. Refunds are processed to the original payment method within 5-10 business days.
              </p>
              <p>
                Cryptocurrency payments are non-refundable due to the irreversible nature of blockchain transactions. In exceptional cases, we may offer store credit.
              </p>
            </div>
          </details>
          <details className="membership-faq-item">
            <summary>How do I switch plans?</summary>
            <div className="membership-faq-content">
              <p>
                PayPal doesn't support automatic tier switching. If you're on a monthly plan and want to switch to yearly, you must cancel your current plan via your Account Dashboard. You will retain access for the remainder of your paid period. Once it expires, you can purchase the new plan here.
              </p>
            </div>
          </details>
          <details className="membership-faq-item">
            <summary>How long does it take to get my Discord role?</summary>
            <div className="membership-faq-content">
              <p>
                Your Discord role is granted instantly upon successful payment. If it hasn't shown up after a few minutes, you can go to your Account Dashboard and click the "Sync Discord Role" button to force a manual sync.
              </p>
            </div>
          </details>
        </div>
      </div>

      <footer className="membership-footer">
        <p>Secure payment via PayPal. Lifetime subscriptions are one-time payments. Cancel recurring subscriptions at any time.</p>
        <p style={{ marginTop: "8px" }}>Looking for the old Patreon options? Existing subscribers retain their access via Patreon, but new subscriptions are PayPal-only.</p>
      </footer>

      {successPlan && (
        <SuccessPopup
          planCategory={successPlan.category as "PREMIUM" | "LEAK_PROTECTION"}
          planInterval={successPlan.interval as "MONTHLY" | "YEARLY" | "LIFETIME"}
          roleAssigned={successPlan.roleAssigned}
          onClose={() => setSuccessPlan(null)}
        />
      )}
    </>
  );
}
