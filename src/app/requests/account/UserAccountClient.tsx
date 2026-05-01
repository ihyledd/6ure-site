"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { getDiscordLoginUrl } from "@/lib/auth-urls";
import { ACCOUNT_PLAN_ORDER, groupSubscriptionsForAccount } from "@/lib/account-subscription-groups";
import type { AccountSubscription } from "./account-subscription-types";
import { AccountPlanSubscriptionCard } from "./AccountPlanSubscriptionCard";

const CANCEL_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using it enough" },
  { value: "technical", label: "Technical or billing issues" },
  { value: "other", label: "Other" },
] as const;

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0a0a0b",
  color: "#e2e2e5",
  fontSize: "14px",
};

const textareaStyle: React.CSSProperties = {
  ...selectStyle,
  resize: "vertical" as const,
};

type UserAccountClientProps = {
  /** Same OAuth URL as header login; fallback if omitted. */
  discordLoginUrl?: string;
};

export function UserAccountClient({ discordLoginUrl }: UserAccountClientProps) {
  const { data: session, status: sessionStatus, update } = useSession();
  const [subs, setSubs] = useState<AccountSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<string>("too_expensive");
  const [reasonDetail, setReasonDetail] = useState("");
  const [winbackBanner, setWinbackBanner] = useState<{ code: string; expiresAt: string } | null>(null);
  const [syncSubBusyId, setSyncSubBusyId] = useState<string | null>(null);
  const [syncSubNote, setSyncSubNote] = useState<{ subId: string; text: string; err?: boolean } | null>(null);
  const [invoiceEmailBusyId, setInvoiceEmailBusyId] = useState<string | null>(null);
  const [invoiceToast, setInvoiceToast] = useState<{ paymentId: string; text: string; err?: boolean } | null>(null);

  const grouped = useMemo(() => groupSubscriptionsForAccount(subs), [subs]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      if (sessionStatus !== "loading") setLoading(false);
      return;
    }

    async function fetchSubs() {
      try {
        const res = await fetch("/api/user/subscription");
        const data = await res.json();
        if (res.ok) {
          setSubs(data.subscriptions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubs();
  }, [sessionStatus]);

  const syncSubscriptionDiscordRole = async (subId: string) => {
    setSyncSubBusyId(subId);
    setSyncSubNote(null);
    try {
      const res = await fetch("/api/user/subscription/sync-discord-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSyncSubNote({
          subId,
          text: data.alreadyHasRole
            ? "You already have this Discord role — no changes needed."
            : "✓ Discord role added successfully and your account was synced.",
        });
        setSubs((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, discordRolePresent: true } : s))
        );
        await update?.();
      } else {
        setSyncSubNote({
          subId,
          text: typeof data.error === "string" ? data.error : "Could not sync Discord role.",
          err: true,
        });
      }
    } catch {
      setSyncSubNote({ subId, text: "Network error", err: true });
    } finally {
      setSyncSubBusyId(null);
    }
  };

  const reactivateSubscription = async (subId: string) => {
    try {
      const res = await fetch("/api/user/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubs((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, status: "ACTIVE" } : s))
        );
        alert("Subscription reactivated successfully!");
      } else {
        alert(data.error || "Could not reactivate subscription.");
      }
    } catch {
      alert("Network error while trying to reactivate.");
    }
  };

  const sendInvoiceEmail = async (paymentId: string) => {
    setInvoiceEmailBusyId(paymentId);
    setInvoiceToast(null);
    try {
      const res = await fetch(`/api/user/subscription/invoice/${encodeURIComponent(paymentId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sentTo) {
        setInvoiceToast({ paymentId, text: `Receipt emailed to ${data.sentTo}` });
      } else {
        setInvoiceToast({
          paymentId,
          text: typeof data.error === "string" ? data.error : "Could not send email",
          err: true,
        });
      }
    } catch {
      setInvoiceToast({ paymentId, text: "Network error", err: true });
    } finally {
      setInvoiceEmailBusyId(null);
    }
  };

  const openCancelModal = (id: string) => {
    setCancelModalId(id);
    setReasonCode("too_expensive");
    setReasonDetail("");
  };

  const submitCancel = async () => {
    if (!cancelModalId) return;
    if (!reasonCode) {
      alert("Please select a reason for cancelling.");
      return;
    }
    setCanceling(cancelModalId);
    try {
      const res = await fetch("/api/user/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: cancelModalId,
          reasonCode,
          reasonDetail: reasonDetail.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const accessEndsAt =
          typeof data.accessEndsAt === "string" ? data.accessEndsAt : null;
        setSubs((prev) =>
          prev.map((s) =>
            s.id === cancelModalId
              ? {
                  ...s,
                  status: "CANCELLED",
                  cancelled_at: new Date().toISOString(),
                  current_period_end: accessEndsAt ?? s.current_period_end,
                }
              : s
          )
        );
        setCancelModalId(null);
        if (data.winbackOffered && data.winbackCode) {
          setWinbackBanner({
            code: data.winbackCode,
            expiresAt: data.winbackExpiresAt || "",
          });
        }
      } else {
        alert(`Failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Failed to cancel subscription");
    } finally {
      setCanceling(null);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="account-loading" aria-busy="true">
        <div className="account-loading-spinner" />
        <p>Loading your account…</p>
      </div>
    );
  }

  if (!session?.user) {
    const loginUrl = discordLoginUrl ?? getDiscordLoginUrl("/requests/account");
    return (
      <div className="account-guest-card">
        <div className="account-guest-icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="account-guest-title">Account & subscriptions</h2>
        <p className="account-guest-text">
          Sign in with Discord to view your membership, billing dates, and payment history.
        </p>
        <a href={loginUrl} className="account-guest-cta">
          Login with Discord
        </a>
      </div>
    );
  }

  return (
    <>
      <header className="account-hero">
        <div className="account-hero-inner">
          <p className="account-hero-kicker">Billing</p>
          <h1 className="account-hero-title">Account & subscriptions</h1>
          <p className="account-hero-desc">
            Manage PayPal memberships, see renewal dates, and review payment history.
          </p>
        </div>
      </header>

      {winbackBanner && (
        <div className="account-winback">
          <p className="account-winback-title">Comeback offer</p>
          <p style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.5 }}>
            20% off your next <strong>monthly</strong> subscription when you resubscribe. Use this code at checkout on the membership page (monthly billing):
          </p>
          <code className="account-winback-code">{winbackBanner.code}</code>
          {winbackBanner.expiresAt && (
            <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#72767d" }}>
              Expires {format(new Date(winbackBanner.expiresAt), "MMMM d, yyyy")} · One use · Linked to your account only
            </p>
          )}
          <button
            type="button"
            onClick={() => setWinbackBanner(null)}
            style={{ marginTop: "12px", background: "transparent", border: "none", color: "#72767d", cursor: "pointer", fontSize: "13px" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="account-info-grid">
        <article className="account-info-card">
          <div className="account-info-card-head">
            <div className="account-info-card-icon account-info-card-icon--plan" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div className="account-info-card-head-text">
              <p className="account-info-card-kicker">Plans</p>
              <h3 className="account-info-card-title">Change plan</h3>
            </div>
          </div>
          <div className="account-info-card-body">
            <p className="account-info-card-text">
              PayPal doesn&apos;t support switching tiers in place. Cancel your current subscription (you keep access until
              the paid period ends), then pick a new plan on the membership page.
            </p>
          </div>
          <div className="account-info-card-footer">
            <a href="/membership" className="account-info-card-cta">
              View membership plans
            </a>
          </div>
        </article>

        <article className="account-info-card">
          <div className="account-info-card-head">
            <div className="account-info-card-icon account-info-card-icon--billing" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div className="account-info-card-head-text">
              <p className="account-info-card-kicker">Support</p>
              <h3 className="account-info-card-title">Billing help</h3>
            </div>
          </div>
          <div className="account-info-card-body">
            <ul className="account-info-card-bullets">
              <li>Receipts and tax docs usually arrive from <strong>PayPal</strong> by email.</li>
              <li>
                Failed or duplicate charges: fix the payment method in PayPal first, then email{" "}
                <a href="mailto:contact@6ureleaks.com">contact@6ureleaks.com</a> with your transaction ID.
              </li>
              <li>Use <strong>Sync Discord role</strong> on your active plan card if a role is missing after payment.</li>
            </ul>
          </div>
          <div className="account-info-card-footer account-info-card-footer--split">
            <a href="/terms" className="account-info-card-cta account-info-card-cta--quiet">
              Terms
            </a>
            <a href="/privacy" className="account-info-card-cta account-info-card-cta--quiet">
              Privacy
            </a>
          </div>
        </article>
      </div>

      <div className="account-subscriptions-stack">
        {subs.length === 0 ? (
          <div className="account-empty">
            <p>You don&apos;t have any PayPal subscriptions on file yet.</p>
            <a href="/membership" className="account-guest-cta" style={{ marginTop: 0 }}>
              View membership plans
            </a>
          </div>
        ) : (
          ACCOUNT_PLAN_ORDER.map((cat) => {
            const g = grouped[cat];
            if (!g) return null;
            return (
              <AccountPlanSubscriptionCard
                key={cat}
                category={cat}
                featured={g.featured}
                others={g.others}
                canceling={canceling}
                onOpenCancel={openCancelModal}
                syncSubBusyId={syncSubBusyId}
                syncSubNote={syncSubNote}
                onSyncDiscordRole={syncSubscriptionDiscordRole}
                invoiceEmailBusyId={invoiceEmailBusyId}
                invoiceToast={invoiceToast}
                onSendInvoiceEmail={sendInvoiceEmail}
                onReactivate={reactivateSubscription}
              />
            );
          })
        )}
      </div>

      {cancelModalId && (
        <div className="account-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
          <div className="account-modal">
            <h2 id="cancel-dialog-title" style={{ margin: "0 0 8px", color: "#fff", fontSize: "20px" }}>
              Cancel subscription
            </h2>
            <p style={{ color: "#b9bbbe", fontSize: "14px", margin: "0 0 20px", lineHeight: 1.5 }}>
              We&apos;re sorry to see you go. Please tell us why so we can improve.
            </p>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#72767d", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>Reason</label>
              <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} style={selectStyle}>
                {CANCEL_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#72767d", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>Details (optional)</label>
              <textarea
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={3}
                placeholder="Anything else we should know?"
                style={textareaStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => !canceling && setCancelModalId(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#b9bbbe",
                  cursor: canceling ? "not-allowed" : "pointer",
                }}
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={!!canceling}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(237, 66, 69, 0.25)",
                  color: "#ED4245",
                  fontWeight: 600,
                  cursor: canceling ? "wait" : "pointer",
                }}
              >
                {canceling ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
