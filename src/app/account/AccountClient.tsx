"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import "@/styles/account.css";

interface Sub {
  id: string;
  plan_category: string;
  plan_interval: string;
  status: string;
  amount: string;
  email: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

interface PaymentRow {
  id: string;
  subscription_id: string;
  amount: string;
  status: string;
  created_at: string;
  refund_amount: string | null;
}

const CANCEL_REASONS = [
  "Too expensive",
  "Not using the service",
  "Found a better alternative",
  "Missing features I need",
  "Temporary break",
  "Other",
];

export function AccountClient() {
  const { data: session, status } = useSession();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<Sub | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetails, setCancelDetails] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions ?? []);
        setPayments(data.payments ?? []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (session?.user) fetchData();
    else setLoading(false);
  }, [session, fetchData]);

  const handleCancel = async () => {
    if (!cancelModal) return;
    setProcessing(true);
    const reason = cancelReason === "Other" ? cancelDetails : cancelReason;
    try {
      const res = await fetch("/api/user/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", subscriptionId: cancelModal.id, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelModal(null);
        fetchData();
      } else alert(data.error || "Failed to cancel");
    } catch { alert("Something went wrong"); }
    finally { setProcessing(false); }
  };

  if (status === "loading" || loading) return <div className="account-page"><p>Loading...</p></div>;
  if (!session?.user) return <div className="account-page"><p>Please sign in to view your account.</p></div>;

  const planLabel = (cat: string) => cat === "PREMIUM" ? "Premium" : "Leak Protection";
  const intervalLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  const statusClass = (s: string) => s.toLowerCase().includes("active") ? "active" : s.toLowerCase().includes("cancel") ? "cancelled" : "pending";

  return (
    <div className="account-page">
      <h1>My Account</h1>
      <p>Manage your subscriptions and view payment history.</p>

      {subs.length === 0 ? (
        <div className="account-empty">
          <p>No subscriptions yet.</p>
          <p><Link href="/membership">Browse plans →</Link></p>
        </div>
      ) : (
        subs.map((sub) => (
          <div key={sub.id} className="account-sub-card">
            <div className="account-sub-header">
              <div className="account-sub-plan">
                <h3>{planLabel(sub.plan_category)} — {intervalLabel(sub.plan_interval)}</h3>
              </div>
              <span className={`account-sub-status ${statusClass(sub.status)}`}>{sub.status}</span>
            </div>
            <div className="account-sub-details">
              <div className="account-sub-detail-item">
                <label>Amount</label>
                <span>${parseFloat(sub.amount).toFixed(2)} / {sub.plan_interval === "LIFETIME" ? "one-time" : sub.plan_interval.toLowerCase()}</span>
              </div>
              <div className="account-sub-detail-item">
                <label>Started</label>
                <span>{new Date(sub.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              {sub.email && (
                <div className="account-sub-detail-item">
                  <label>Email</label>
                  <span>{sub.email}</span>
                </div>
              )}
              {sub.cancelled_at && (
                <div className="account-sub-detail-item">
                  <label>Cancelled</label>
                  <span>{new Date(sub.cancelled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              )}
            </div>
            <div className="account-sub-actions">
              {sub.status === "ACTIVE" && (
                <button className="account-btn danger" onClick={() => setCancelModal(sub)}>Cancel Subscription</button>
              )}
              {sub.status !== "ACTIVE" && (
                <Link href="/membership" className="account-btn primary" style={{ textDecoration: "none" }}>Resubscribe</Link>
              )}
            </div>
          </div>
        ))
      )}

      {payments.length > 0 && (
        <div className="account-payments">
          <h3>Payment History</h3>
          <table className="payment-table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td>${parseFloat(p.amount).toFixed(2)}</td>
                  <td><span className={`payment-status ${p.status.toLowerCase()}`}>{p.status}{p.refund_amount ? ` (-$${parseFloat(p.refund_amount).toFixed(2)})` : ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cancelModal && (
        <div className="cancel-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Subscription</h3>
            <p>We&apos;re sorry to see you go! Why are you cancelling?</p>
            <select className="cancel-reason-select" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
              <option value="">Select a reason...</option>
              {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {cancelReason === "Other" && (
              <textarea className="cancel-reason-text" placeholder="Please tell us more..." value={cancelDetails} onChange={(e) => setCancelDetails(e.target.value)} />
            )}
            <div className="cancel-modal-actions">
              <button className="account-btn" style={{ background: "var(--card-bg-hover, #1e1e2e)", color: "var(--text-primary, #fff)" }} onClick={() => setCancelModal(null)}>Keep Subscription</button>
              <button className="account-btn danger" onClick={handleCancel} disabled={!cancelReason || processing}>
                {processing ? "Processing..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
