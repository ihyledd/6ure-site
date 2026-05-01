"use client";

import { format, formatDistanceToNow } from "date-fns";
import type { PlanCategoryKey } from "@/lib/account-subscription-groups";
import type { AccountPayment, AccountSubscription } from "./account-subscription-types";
import { isSubscriptionEligibleForDiscordSync } from "@/lib/subscription-discord-sync-eligible";

function subscriptionUi(sub: AccountSubscription) {
  const st = String(sub.status ?? "").trim().toUpperCase();
  const interval = String(sub.plan_interval ?? "").trim().toUpperCase();
  const isLifetime = interval === "LIFETIME";
  const isActive = st === "ACTIVE" || st === "PENDING";
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const gracePeriodAccessRemaining =
    (st === "CANCELLED" || st === "SUSPENDED") &&
    periodEnd !== null &&
    !isNaN(periodEnd.getTime()) &&
    periodEnd.getTime() > Date.now();
  const showMemberBenefits = isActive || gracePeriodAccessRemaining;

  let badgeLabel = sub.status;
  if (gracePeriodAccessRemaining) {
    badgeLabel = st === "SUSPENDED" ? "SUSPENDED (access active)" : "CANCELLED (access active)";
  }

  return {
    isLifetime,
    isActive,
    periodEnd,
    gracePeriodAccessRemaining,
    showMemberBenefits,
    badgeLabel,
  };
}

function planTitle(cat: PlanCategoryKey): string {
  return cat === "PREMIUM" ? "Premium" : "Leak Protection";
}

type CardProps = {
  category: PlanCategoryKey;
  featured: AccountSubscription;
  others: AccountSubscription[];
  canceling: string | null;
  onOpenCancel: (id: string) => void;
  syncSubBusyId: string | null;
  syncSubNote: { subId: string; text: string; err?: boolean } | null;
  onSyncDiscordRole: (id: string) => void;
  invoiceEmailBusyId: string | null;
  invoiceToast: { paymentId: string; text: string; err?: boolean } | null;
  onSendInvoiceEmail: (paymentId: string) => void;
  onReactivate: (id: string) => void;
};

function PaymentBlock({
  sub,
  invoiceEmailBusyId,
  invoiceToast,
  onSendInvoiceEmail,
  compact,
}: {
  sub: AccountSubscription;
  invoiceEmailBusyId: string | null;
  invoiceToast: { paymentId: string; text: string; err?: boolean } | null;
  onSendInvoiceEmail: (paymentId: string) => void;
  compact?: boolean;
}) {
  const visiblePayments = (sub.payments || []).filter(
    (p: AccountPayment) => !String(p.paypal_sale_id || "").startsWith("callback-")
  );
  if (visiblePayments.length === 0) return null;

  return (
    <div className={compact ? "account-pay-section account-pay-section--compact" : "account-pay-section"}>
      {!compact && (
        <div className="account-pay-section-head">
          <h3 className="account-pay-section-title">Payment history</h3>
          <p className="account-pay-section-desc">Invoices and receipts for this subscription.</p>
        </div>
      )}
      {invoiceToast && !compact && (
        <p
          className={`account-invoice-toast${invoiceToast.err ? " account-invoice-toast--err" : ""}`}
        >
          {invoiceToast.text}
        </p>
      )}
      <div className="account-pay-list">
        {visiblePayments.map((p) => {
          const receiptStatusClass =
            p.status === "COMPLETED"
              ? " account-pay-status--ok"
              : p.status === "REFUNDED"
                ? " account-pay-status--refunded"
                : " account-pay-status--pending";
          const canShowReceiptTools = p.status === "COMPLETED" || p.status === "REFUNDED";

          return (
            <div key={p.id} className="account-pay-row">
              <div className="account-pay-row-main">
                <div className="account-pay-amount-block">
                  <p className="account-pay-amount">${p.amount}</p>
                  <p className="account-pay-date">{format(new Date(p.created_at), "MMM d, yyyy")}</p>
                </div>
                <span className={`account-pay-status${receiptStatusClass}`}>
                  {p.status}
                </span>
              </div>
              {canShowReceiptTools && (
                <div className="account-pay-tools">
                  <a
                    href={`/api/user/subscription/invoice/${encodeURIComponent(p.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="account-pay-btn account-pay-btn-main"
                  >
                    View invoice
                  </a>
                  <div className="account-pay-tools-row" aria-label="Receipt options">
                    <a
                      href={`/api/user/subscription/invoice/${encodeURIComponent(p.id)}/pdf`}
                      download={`6ure-receipt-${p.id.slice(-8)}.pdf`}
                      className="account-pay-btn account-pay-btn-ghost"
                      title="Download PDF receipt"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/user/subscription/invoice/${encodeURIComponent(p.id)}?print=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="account-pay-btn account-pay-btn-ghost"
                      title="Print or save as PDF"
                    >
                      Print
                    </a>
                    <button
                      type="button"
                      className="account-pay-btn account-pay-btn-ghost"
                      disabled={invoiceEmailBusyId === p.id}
                      title="Email receipt to your address on file"
                      onClick={() => onSendInvoiceEmail(p.id)}
                    >
                      {invoiceEmailBusyId === p.id ? "Sending…" : "Email"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <div style={{ marginTop: "16px", fontSize: "12px", color: "#72767d", lineHeight: 1.5, background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <strong style={{ color: "#e2e2e5", display: "block", marginBottom: "8px" }}>Refund Policy</strong>
          <ul style={{ margin: "0 0 12px 0", paddingLeft: "20px" }}>
            <li>•<strong> Perks do not function as described:</strong> Eligible within 14 days.</li>
            <li>•<strong> Accidental duplicate purchase:</strong> Eligible within 14 days.</li>
            <li>•<strong> Change of mind:</strong> Handled case-by-case within 48 hours.</li>
            <li>•<strong> Perks already used or Violation of Terms:</strong> Not eligible for refund.</li>
          </ul>
          <p style={{ margin: "0 0 8px" }}>To request a refund, contact us at contact@6ureleaks.com with your payment details. Refunds are processed to the original payment method within 5-10 business days.</p>
        </div>
      )}
    </div>
  );
}

function FeaturedBody(props: CardProps) {
  const sub = props.featured;
  const u = subscriptionUi(sub);
  const canSyncDiscordRole = isSubscriptionEligibleForDiscordSync(sub);
  const hasDiscordRole = sub.discordRolePresent === true;

  return (
    <>
      <div className="account-sub-head">
        <div className="account-sub-head-main">
          <p className="account-sub-plan-kicker">
            {u.isActive || u.gracePeriodAccessRemaining ? "Current subscription" : "Latest on file"}
          </p>
          <div className="account-sub-title-row">
            <h2 className="account-sub-title">{planTitle(props.category)}</h2>
            <span
              className="account-sub-badge"
              style={{
                background: u.showMemberBenefits
                  ? u.gracePeriodAccessRemaining
                    ? "rgba(250, 166, 26, 0.12)"
                    : "rgba(87, 242, 135, 0.1)"
                  : "rgba(237, 66, 69, 0.1)",
                color: u.showMemberBenefits
                  ? u.gracePeriodAccessRemaining
                    ? "#FAA61A"
                    : "#57F287"
                  : "#ED4245",
              }}
            >
              {u.badgeLabel}
            </span>
          </div>
          {u.gracePeriodAccessRemaining && u.periodEnd && (
            <p className="account-sub-banner-note">
              {sub.status === "SUSPENDED" ? (
                <>
                  Your subscription is suspended, but your paid access continues until{" "}
                  <strong>{format(u.periodEnd, "MMMM d, yyyy")}</strong>
                  {" · "}
                  <span className="account-sub-banner-warn">
                    Access ends {formatDistanceToNow(u.periodEnd, { addSuffix: true })}
                  </span>
                  .
                </>
              ) : (
                <>
                  Auto-renew is off. Your membership stays active until{" "}
                  <strong>{format(u.periodEnd, "MMMM d, yyyy")}</strong>
                  {" · "}
                  <span className="account-sub-banner-warn">
                    Access ends {formatDistanceToNow(u.periodEnd, { addSuffix: true })}
                  </span>
                  .
                </>
              )}
            </p>
          )}
          {u.isActive &&
            !u.isLifetime &&
            u.periodEnd &&
            !isNaN(u.periodEnd.getTime()) &&
            u.periodEnd.getTime() > Date.now() && (
              <p className="account-sub-renew-hint">
                Renews {formatDistanceToNow(u.periodEnd, { addSuffix: true })} (
                {format(u.periodEnd, "MMM d, yyyy")})
                {sub.status === "ACTIVE" && u.periodEnd.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && (
                  <span style={{ display: "block", color: "#FAA61A", marginTop: "4px" }}>
                    Your subscription renews very soon. <a href="https://www.paypal.com/myaccount/autopay" target="_blank" rel="noopener noreferrer" style={{ color: "#FAA61A", textDecoration: "underline" }}>Manage on PayPal →</a>
                  </span>
                )}
              </p>
            )}
          <p className="account-sub-price-line">
            <span className="account-sub-price">${sub.amount}</span>
            <span className="account-sub-price-sep">/</span>
            <span className="account-sub-interval">
              {u.isLifetime ? "Lifetime Access" : sub.plan_interval.toLowerCase()}
            </span>
          </p>
        </div>

        {(() => {
          if (!((u.isActive && !u.isLifetime) || canSyncDiscordRole)) return null;
          return (
            <div className="account-sub-head-actions">
              {u.isActive && !u.isLifetime && sub.status !== "SUSPENDED" && (
                <button
                  type="button"
                  className="account-btn-cancel"
                  onClick={() => props.onOpenCancel(sub.id)}
                  disabled={props.canceling === sub.id}
                >
                  Cancel plan
                </button>
              )}
              {sub.status === "SUSPENDED" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                  <a
                    href="https://www.paypal.com/myaccount/autopay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="account-btn-cancel"
                    style={{ background: "#0079C1", color: "#fff", borderColor: "#0079C1" }}
                  >
                    Update Payment on PayPal
                  </a>
                  <button
                    type="button"
                    className="account-btn-sync-role"
                    onClick={() => props.onReactivate(sub.id)}
                    title="Click here after updating your payment method to reactivate"
                  >
                    Reactivate
                  </button>
                </div>
              )}
              {canSyncDiscordRole && (
                <>
                  <button
                    type="button"
                    className="account-btn-sync-role"
                    onClick={() => props.onSyncDiscordRole(sub.id)}
                    disabled={props.syncSubBusyId === sub.id}
                    title={
                      hasDiscordRole
                        ? "Force re-sync this Discord role (use if another bot removed it)"
                        : "Add the Discord role for this plan"
                    }
                  >
                    {props.syncSubBusyId === sub.id
                      ? "Syncing…"
                      : hasDiscordRole
                        ? "Re-sync Discord role"
                        : "Sync Discord role"}
                  </button>

                  {props.syncSubNote?.subId === sub.id && (
                    <p
                      className={
                        props.syncSubNote.err
                          ? "account-sub-sync-note account-sub-sync-note--err"
                          : "account-sub-sync-note account-sub-sync-note--ok"
                      }
                    >
                      {props.syncSubNote.text}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      <div className="account-sub-details">
        <div className="account-sub-grid">
          <div>
            <p className="account-sub-label">Payment method</p>
            <p className="account-sub-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0079C1">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
              </svg>
              {sub.email || "PayPal"}
            </p>
          </div>
          <div>
            <p className="account-sub-label">Billing interval</p>
            <p className="account-sub-value">{u.isLifetime ? "One-time payment" : sub.plan_interval}</p>
          </div>
          {!u.isLifetime && sub.current_period_end && (
            <div>
              <p className="account-sub-label">
                {u.gracePeriodAccessRemaining
                  ? "Access until"
                  : u.isActive
                    ? "Next billing date"
                    : "Ends on"}
              </p>
              <p className="account-sub-value">{format(new Date(sub.current_period_end), "MMMM d, yyyy")}</p>
              {u.gracePeriodAccessRemaining && u.periodEnd && u.periodEnd.getTime() > Date.now() && (
                <p className="account-sub-distance">{formatDistanceToNow(u.periodEnd, { addSuffix: true })}</p>
              )}
            </div>
          )}
          {sub.cancelled_at && (
            <div>
              <p className="account-sub-label">Cancelled on</p>
              <p className="account-sub-value" style={{ color: "#ED4245" }}>
                {format(new Date(sub.cancelled_at), "MMMM d, yyyy")}
              </p>
            </div>
          )}
        </div>
      </div>

      <PaymentBlock
        sub={sub}
        invoiceEmailBusyId={props.invoiceEmailBusyId}
        invoiceToast={props.invoiceToast}
        onSendInvoiceEmail={props.onSendInvoiceEmail}
      />
    </>
  );
}

export function AccountPlanSubscriptionCard(props: CardProps) {
  const { others } = props;

  return (
    <div className="account-sub-card account-sub-card--grouped">
      <FeaturedBody {...props} />
      {others.length > 0 && (
        <details className="account-sub-history">
          <summary className="account-sub-history-summary">
            Past subscriptions
            <span className="account-sub-history-count">{others.length}</span>
          </summary>
          <div className="account-sub-history-list">
            {others.map((sub) => {
              const u = subscriptionUi(sub);
              return (
                <div key={sub.id} className="account-sub-history-item">
                  <div className="account-sub-history-item-head">
                    <span
                      className="account-sub-badge account-sub-badge--sm"
                      style={{
                        background: u.showMemberBenefits
                          ? u.gracePeriodAccessRemaining
                            ? "rgba(250, 166, 26, 0.12)"
                            : "rgba(87, 242, 135, 0.1)"
                          : "rgba(237, 66, 69, 0.1)",
                        color: u.showMemberBenefits
                          ? u.gracePeriodAccessRemaining
                            ? "#FAA61A"
                            : "#57F287"
                          : "#ED4245",
                      }}
                    >
                      {u.badgeLabel}
                    </span>
                    <span className="account-sub-history-price">
                      ${sub.amount} / {u.isLifetime ? "lifetime" : sub.plan_interval.toLowerCase()}
                    </span>
                  </div>
                  <p className="account-sub-history-meta">
                    {sub.created_at && (
                      <span>Started {format(new Date(sub.created_at), "MMM d, yyyy")}</span>
                    )}
                    {sub.cancelled_at && (
                      <span> · Cancelled {format(new Date(sub.cancelled_at), "MMM d, yyyy")}</span>
                    )}
                  </p>
                  <PaymentBlock
                    sub={sub}
                    invoiceEmailBusyId={props.invoiceEmailBusyId}
                    invoiceToast={props.invoiceToast}
                    onSendInvoiceEmail={props.onSendInvoiceEmail}
                    compact
                  />
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
