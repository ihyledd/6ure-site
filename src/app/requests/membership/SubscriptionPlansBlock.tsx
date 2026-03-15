"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MarkdownProse } from "@/components/Markdown";

type SubscriptionPlansBlockProps = {
  settings: Record<string, string>;
  isPremium: boolean;
  isLeakProtection: boolean;
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

export function SubscriptionPlansBlock({
  settings,
  isPremium,
  isLeakProtection,
}: SubscriptionPlansBlockProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const currentPlan = useMemo(() => getCurrentPlanCard(isPremium, isLeakProtection), [isPremium, isLeakProtection]);

  const heroTitle = settings.hero_title ?? "Choose your membership";
  const heroSubtitle = settings.hero_subtitle ?? "";
  const discountActive = settings.discount_active === "true";

  const basicTitle = settings.basic_card_title ?? "Basic";
  const basicCta = settings.basic_cta_text ?? "Get started";
  const basicJoinUrl = settings.basic_join_url ?? "";

  const premiumTitle = settings.premium_card_title ?? "Premium";
  const premiumLabel = settings.premium_card_label ?? "";
  const premiumMonthly = settings.premium_monthly ?? "0";
  const premiumYearly = settings.premium_yearly ?? "0";
  const premiumOldPriceYearly = settings.premium_old_price_yearly ?? "";
  const premiumSaveLabel = settings.premium_save_label ?? "";
  const premiumBadge = settings.premium_badge_text ?? "";
  const premiumCta = settings.premium_cta_text ?? "Select Plan";
  const premiumJoinUrl = settings.premium_join_url ?? "";
  const premiumNote = settings.premium_note ?? "";
  const premiumWarning = settings.premium_warning ?? "";
  const premiumFeatures = useMemo(() => parseFeaturesJson(settings.premium_features), [settings.premium_features]);

  const protectionTitle = settings.protection_card_title ?? "Leak Protection";
  const protectionLabel = settings.protection_card_label ?? "";
  const protectionMonthly = settings.protection_monthly ?? "0";
  const protectionYearly = settings.protection_yearly ?? "0";
  const protectionOldPriceYearly = settings.protection_old_price_yearly ?? "";
  const protectionSaveLabel = settings.protection_save_label ?? "";
  const protectionBadge = settings.protection_badge_text ?? "";
  const protectionCta = settings.protection_cta_text ?? "Select Plan";
  const protectionJoinUrl = settings.protection_join_url ?? "";
  const protectionNote = settings.protection_note ?? "";
  const protectionWarning = settings.protection_warning ?? "";
  const protectionLegalNote = settings.protection_legal_note ?? "";
  const protectionFeatures = useMemo(() => parseFeaturesJson(settings.protection_features), [settings.protection_features]);

  const footerSecurity = settings.footer_security_line ?? "100% secure payment method with money back guarantee.";
  const footerCtaText = settings.footer_cta_text ?? "Upgrade Now";
  const footerCtaUrl = settings.footer_cta_url ?? "";

  const formatPrice = (value: string) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return value;
    if (n === 0) return "$0";
    return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
  };

  return (
    <>
      <section className="protected-hero membership-hero">
        <h1>{heroTitle}</h1>
        {heroSubtitle && (
          <div className="protected-hero-subtitle membership-hero-subtitle">
            <MarkdownProse content={heroSubtitle} className="membership-hero-subtitle-prose" />
          </div>
        )}
      </section>

      {discountActive && (
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
              Annual
            </button>
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
              <span className="membership-plan-period">/ Per user / Per month</span>
            </div>
            {basicJoinUrl ? (
              <Link
                href={basicJoinUrl}
                className={`membership-plan-cta ${currentPlan === "basic" ? "membership-plan-cta-current" : "membership-plan-cta-primary"}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentPlan === "basic" ? "Current Plan" : basicCta}
              </Link>
            ) : (
              <span className={`membership-plan-cta membership-plan-cta-current ${currentPlan !== "basic" ? "membership-plan-cta-muted" : ""}`}>
                {currentPlan === "basic" ? "Current Plan" : basicCta}
              </span>
            )}
          </div>
        </div>

        {/* Premium */}
        <div className={`membership-plan-card membership-plan-featured ${currentPlan === "premium" ? "membership-plan-current" : ""}`}>
          <div className="membership-plan-card-inner">
            {premiumBadge && <span className="membership-plan-badge">{premiumBadge}</span>}
            <h2 className="membership-plan-title">{premiumTitle}</h2>
            {premiumLabel && <p className="membership-plan-label">{premiumLabel}</p>}
            <div className="membership-plan-price-row">
              {billing === "annual" && premiumOldPriceYearly && (
                <span className="membership-plan-old-price">{formatPrice(premiumOldPriceYearly)}</span>
              )}
              <span className="membership-plan-price">
                {formatPrice(billing === "annual" ? premiumYearly : premiumMonthly)}
              </span>
              <span className="membership-plan-period">/ Per user / Per month</span>
              {billing === "annual" && premiumSaveLabel && (
                <span className="membership-plan-save">{premiumSaveLabel}</span>
              )}
            </div>
            {premiumJoinUrl ? (
              <Link
                href={premiumJoinUrl}
                className={`membership-plan-cta ${currentPlan === "premium" ? "membership-plan-cta-current" : "membership-plan-cta-primary"}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentPlan === "premium" ? "Current Plan" : premiumCta}
              </Link>
            ) : (
              <span className={`membership-plan-cta ${currentPlan === "premium" ? "membership-plan-cta-current" : "membership-plan-cta-muted"}`}>
                {currentPlan === "premium" ? "Current Plan" : premiumCta}
              </span>
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
            {premiumNote && (
              <div className="membership-plan-note">
                <MarkdownProse content={premiumNote} className="membership-plan-note-prose" />
              </div>
            )}
            {premiumWarning && (
              <div className="membership-plan-warning">
                <MarkdownProse content={premiumWarning} className="membership-plan-warning-prose" />
              </div>
            )}
          </div>
        </div>

        {/* Leak Protection */}
        <div className={`membership-plan-card ${currentPlan === "leak_protection" ? "membership-plan-current" : ""}`}>
          <div className="membership-plan-card-inner">
            {protectionBadge && <span className="membership-plan-badge">{protectionBadge}</span>}
            <h2 className="membership-plan-title">{protectionTitle}</h2>
            {protectionLabel && <p className="membership-plan-label">{protectionLabel}</p>}
            <div className="membership-plan-price-row">
              {billing === "annual" && protectionOldPriceYearly && (
                <span className="membership-plan-old-price">{formatPrice(protectionOldPriceYearly)}</span>
              )}
              <span className="membership-plan-price">
                {formatPrice(billing === "annual" ? protectionYearly : protectionMonthly)}
              </span>
              <span className="membership-plan-period">/ Per user / Per month</span>
              {billing === "annual" && protectionSaveLabel && (
                <span className="membership-plan-save">{protectionSaveLabel}</span>
              )}
            </div>
            {protectionJoinUrl ? (
              <Link
                href={protectionJoinUrl}
                className={`membership-plan-cta ${currentPlan === "leak_protection" ? "membership-plan-cta-current" : "membership-plan-cta-primary"}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentPlan === "leak_protection" ? "Current Plan" : protectionCta}
              </Link>
            ) : (
              <span className={`membership-plan-cta ${currentPlan === "leak_protection" ? "membership-plan-cta-current" : "membership-plan-cta-muted"}`}>
                {currentPlan === "leak_protection" ? "Current Plan" : protectionCta}
              </span>
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
            {protectionNote && (
              <div className="membership-plan-note">
                <MarkdownProse content={protectionNote} className="membership-plan-note-prose" />
              </div>
            )}
            {protectionWarning && (
              <div className="membership-plan-warning">
                <MarkdownProse content={protectionWarning} className="membership-plan-warning-prose" />
              </div>
            )}
            {protectionLegalNote && (
              <div className="membership-plan-legal">
                <MarkdownProse content={protectionLegalNote} className="membership-plan-legal-prose" />
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="membership-footer">
        <p className="membership-footer-security">{footerSecurity}</p>
        {footerCtaUrl && (
          <Link
            href={footerCtaUrl}
            className="membership-footer-cta requests-btn-submit"
            target="_blank"
            rel="noopener noreferrer"
          >
            {footerCtaText}
          </Link>
        )}
      </footer>
    </>
  );
}
