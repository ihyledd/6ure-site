"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import "@/styles/account.css";

interface Sub {
  id: string;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  currency: string;
  email: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

interface Payment {
  id: string;
  subscription_id: string;
  amount: string;
  status: string;
  created_at: string;
  refund_amount: string | null;
}

const CANCEL_REASONS = [
  "Too expensive",
  "Not using the features",
  "Switching to another service",
  "Temporary break",
  "Other",
];

export function AccountClient() {
  const { data: session, status } = useSession();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<string | null>(null); // sub id
  const [cancelReason, setCancelReason] = useState("");
  const [cancelText, setCancelText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((data) => {
        setSubs(data.subscriptions ?? []);
        setPayments(data.payments ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      const reason = cancelText
        ? `${cancelReason}: ${cancelText}`
        : cancelReason || "No reason given";
      const res = await fetch("/api/user/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", subscriptionId: cancelModal, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setSubs((prev) =>
          prev.map((s) => (s.id === cancelModal ? { ...s, status: "CANCELLED" } : s))
        );
        setCancelModal(null);
      } else {
        alert(data.error || "Failed to cancel");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setCancelling(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="account-page"><p style={{ color: "#888" }}>Loading...</p></div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="account-page">
        <div className="account-empty">
          <p>Please <a href="#" onClick={(e) => { e.preventDefault(); signIn("discord", { callbackUrl: "/account" }); }}>sign in</a> to manage your account.</p>
        </div>
      </div>
    );
  }

  const activeSubs = subs.filter((s) => s.status === "ACTIVE");
  const pastSubs = subs.filter((s) => s.status !== "ACTIVE");

  return (
    <div className="account-page">
      <h1>My Account</h1>
      <p>Manage your subscriptions and view payment history.</p>

      {subs.length === 0 ? (
        <div className="account-empty">
          <p>You don&apos;t have any subscriptions yet.</p>
          <p><Link href="/membership">Browse membership plans →</Link></p>
        </div>
      ) : (
        <>
          {/* Active subscriptions */}
          {activeSubs.map((sub) => (
            <div className="account-sub-card" key={sub.id}>
              <div className="account-sub-header">
                <div className="account-sub-plan">
                  <h3>
                    {sub.plan_category === "PREMIUM" ? "⭐ Premium" : "🛡️ Leak Protection"}{" "}
                    {sub.plan_interval.charAt(0) + sub.plan_interval.slice(1).toLowerCase()}
                  </h3>
                  <span className="account-sub-status active">Active</span>
                </div>
              </div>
              <div className="account-sub-details">
                <div className="account-sub-detail-item">
                  <label>Amount</label>
                  <span>${parseFloat(sub.amount).toFixed(2)} {sub.currency}</span>
                </div>
                <div className="account-sub-detail-item">
                  <label>Billing Email</label>
                  <span>{sub.email || "—"}</span>
                </div>
                <div className="account-sub-detail-item">
                  <label>Started</label>
                  <span>{new Date(sub.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div className="account-sub-detail-item">
                  <label>Plan</label>
                  <span>{sub.plan_interval === "LIFETIME" ? "Lifetime (no renewal)" : `Renews ${sub.plan_interval.toLowerCase()}`}</span>
                </div>
              </div>
              <div className="account-sub-actions">
                {sub.plan_interval !== "LIFETIME" && (
                  <button
                    className="account-btn danger"
                    onClick={() => { setCancelModal(sub.id); setCancelReason(CANCEL_REASONS[0]); setCancelText(""); }}
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link href="/membership" className="account-btn primary" style={{ textDecoration: "none" }}>
                  Change Plan
                </Link>
              </div>
            </div>
          ))}

          {/* Past subscriptions */}
          {pastSubs.length > 0 && (
            <>
              <h3 style={{ color: "var(--text-primary, #fff)", marginTop: 32, marginBottom: 16 }}>Past Subscriptions</h3>
              {pastSubs.map((sub) => (
                <div className="account-sub-card" key={sub.id} style={{ opacity: 0.6 }}>
                  <div className="account-sub-header">
                    <div className="account-sub-plan">
                      <h3>
                        {sub.plan_category === "PREMIUM" ? "Premium" : "Leak Protection"}{" "}
                        {sub.plan_interval.charAt(0) + sub.plan_interval.slice(1).toLowerCase()}
                      </h3>
                      <span className={`account-sub-status ${sub.status.toLowerCase()}`}>{sub.status}</span>
                    </div>
                  </div>
                  {sub.cancel_reason && (
                    <p style={{ color: "var(--text-secondary, #888)", fontSize: "0.85rem", margin: 0 }}>
                      Reason: {sub.cancel_reason}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="account-payments" style={{ marginTop: 32 }}>
              <h3>Payment History</h3>
              <div style={{ overflowX: "auto" }}>
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td>${parseFloat(p.amount).toFixed(2)}</td>
                        <td><span className={`payment-status ${p.status.toLowerCase()}`}>{p.status}</span></td>
                        <td>{p.refund_amount ? `$${parseFloat(p.refund_amount).toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="cancel-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Subscription</h3>
            <p>We&apos;re sorry to see you go. Please let us know why you&apos;re cancelling:</p>
            <select
              className="cancel-reason-select"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <textarea
              className="cancel-reason-text"
              placeholder="Additional details (optional)"
              value={cancelText}
              onChange={(e) => setCancelText(e.target.value)}
            />
            <div className="cancel-modal-actions">
              <button className="account-btn" style={{ background: "var(--card-bg-hover)", color: "var(--text-primary)" }} onClick={() => setCancelModal(null)}>
                Keep Subscription
              </button>
              <button className="account-btn danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
