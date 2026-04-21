"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

const glassStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 20% 50%, rgba(88,101,242,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(114,137,218,0.05) 0%, transparent 50%), color-mix(in srgb, var(--bg-secondary) 88%, var(--bg-primary))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--glass-border, rgba(255,255,255,0.06))",
  borderRadius: 16,
  boxShadow: "var(--glass-shadow, 0 4px 24px rgba(0,0,0,0.08))",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: "#72767d",
  textTransform: "uppercase" as const,
  marginBottom: 6,
};

function formatPlanCategory(cat: string): string {
  if (!cat) return "";
  return cat
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatInterval(iv: string): string {
  const m: Record<string, string> = {
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
    LIFETIME: "Lifetime",
  };
  return m[iv] || iv;
}

function statusPillStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
  };
  if (status === "ACTIVE")
    return { ...base, color: "#57F287", background: "rgba(87,242,135,0.12)", borderColor: "rgba(87,242,135,0.28)" };
  if (status === "CANCELLED")
    return { ...base, color: "#ED4245", background: "rgba(237,66,69,0.12)", borderColor: "rgba(237,66,69,0.28)" };
  if (status === "PENDING")
    return { ...base, color: "#FAA61A", background: "rgba(250,166,26,0.12)", borderColor: "rgba(250,166,26,0.28)" };
  return { ...base, color: "#b9bbbe", background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" };
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    if (!text || text === "N/A") return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label}`}
      disabled={!text || text === "N/A"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 600,
        color: copied ? "#57F287" : "#72767d",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        cursor: text && text !== "N/A" ? "pointer" : "not-allowed",
        opacity: text && text !== "N/A" ? 1 : 0.45,
      }}
    >
      <CopyIcon />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AdminSubscriptionDetailPage() {
  const { id } = useParams() as { id: string };
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  useEffect(() => {
    async function fetchSub() {
      try {
        const res = await fetch(`/api/admin/subscriptions/${id}`);
        const data = await res.json();
        if (res.ok) {
          setSub(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSub();
  }, [id]);

  const handleCancel = async () => {
    if (
      !confirm(
        "Cancel this subscription in PayPal? Staff cancel removes Discord access immediately (same as before)."
      )
    )
      return;
    setCanceling(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin requested cancellation" }),
      });
      if (res.ok) {
        alert("Subscription cancelled successfully.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (e) {
      alert("An error occurred");
    } finally {
      setCanceling(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    const amount = prompt("Enter amount to refund (leave blank for full refund):");
    if (amount === null) return;

    setRefunding(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amount ? { amount: parseFloat(amount) } : {}),
      });
      if (res.ok) {
        alert("Refund processed successfully.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (e) {
      alert("An error occurred");
    } finally {
      setRefunding(null);
    }
  };

  const paypalHost =
    process.env.NEXT_PUBLIC_PAYPAL_MODE === "live" ? "www.paypal.com" : "www.sandbox.paypal.com";
  const subscriptionDashboardUrl = (sid: string) =>
    `https://${paypalHost}/billing/subscriptions/${sid}`;
  const paypalActivityUrl = `https://${paypalHost}/activity`;

  if (loading) {
    return (
      <div className="dashboard-wide" style={{ maxWidth: 1200, margin: "0 auto", padding: 24, color: "#fff" }}>
        <style>{`@keyframes subDetailSpin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            minHeight: 280,
            ...glassStyle,
            padding: 48,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(255,255,255,0.08)",
              borderTopColor: "#5865f2",
              borderRadius: "50%",
              animation: "subDetailSpin 0.75s linear infinite",
            }}
          />
          <span style={{ color: "#72767d", fontSize: 14 }}>Loading subscription…</span>
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="dashboard-wide" style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <p style={{ color: "#ED4245", fontSize: 15 }}>Subscription not found</p>
        <Link href="/dashboard/subscriptions" style={{ color: "#5865f2", fontSize: 14, marginTop: 12, display: "inline-block" }}>
          &larr; Back to list
        </Link>
      </div>
    );
  }

  const planReadable = `${formatPlanCategory(sub.plan_category)} · ${formatInterval(sub.plan_interval)}`;
  const paypalPrimaryId = sub.paypal_subscription_id || sub.paypal_order_id || "";
  const isSubscriptionPayPal = Boolean(sub.paypal_subscription_id);

  return (
    <div className="dashboard-wide text-white" style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
        <Link href="/dashboard/subscriptions" style={{ color: "#5865f2", fontSize: 14, textDecoration: "none", paddingTop: 4 }}>
          &larr; Back to list
        </Link>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>Subscription Details</h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={statusPillStyle(sub.status)}>{sub.status}</span>
            <span
              style={{
                fontSize: 13,
                color: "#b9bbbe",
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {planReadable}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div style={{ ...glassStyle, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>
              Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <div style={labelStyle}>Plan</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{planReadable}</div>
              </div>
              <div>
                <div style={labelStyle}>Price</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>
                  ${sub.amount} {sub.currency}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Subscriber ID</div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span className="font-mono text-sm" style={{ color: "#b9bbbe", wordBreak: "break-all" }}>
                    {sub.user_id}
                  </span>
                  <CopyButton text={sub.user_id} label="subscriber ID" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <div style={labelStyle}>Created</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>{format(new Date(sub.created_at), "PPpp")}</div>
              </div>
              {sub.plan_interval !== "LIFETIME" && sub.current_period_end && (
                <div className="sm:col-span-2">
                  <div style={labelStyle}>Renewal / period end</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>
                    {format(new Date(sub.current_period_end), "PPP")}
                  </div>
                </div>
              )}
              {sub.cancelled_at && (
                <div className="sm:col-span-2">
                  <div style={labelStyle}>Cancelled</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#ED4245" }}>{format(new Date(sub.cancelled_at), "PPpp")}</div>
                </div>
              )}
            </div>

            {(sub.status === "ACTIVE" || sub.status === "PENDING") && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={canceling}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(237,66,69,0.12)",
                    color: "#F87171",
                    border: "1px solid rgba(237,66,69,0.25)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: canceling ? "wait" : "pointer",
                    opacity: canceling ? 0.7 : 1,
                  }}
                >
                  {canceling ? "Canceling…" : "Cancel Subscription"}
                </button>
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#72767d", maxWidth: 480, lineHeight: 1.5 }}>
                  Staff cancel: revokes Discord access immediately and stops billing. (Member self-cancel keeps access until the paid period ends.)
                </p>
              </div>
            )}
          </div>


          <div style={{ ...glassStyle, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>
              Payment History (All Subscriptions)
            </h2>
            {(() => {
              const paymentRows = (sub.payments || []).filter(
                (payment: { paypal_sale_id?: string | null }) =>
                  !String(payment.paypal_sale_id || "").startsWith("callback-")
              );
              if (paymentRows.length === 0) {
                return <p style={{ fontSize: 14, color: "#72767d", margin: 0 }}>No payments recorded yet.</p>;
              }
              return (
              <details open>
                <summary style={{ cursor: "pointer", color: "#b9bbbe", fontSize: 13, marginBottom: 12 }}>
                  {paymentRows.length} Payment{paymentRows.length === 1 ? "" : "s"} Found
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {paymentRows.map((payment: any) => {
                    const accent =
                      payment.status === "COMPLETED"
                        ? "#57F287"
                        : payment.status === "REFUNDED"
                          ? "#FAA61A"
                          : "#72767d";
                    const txnId = payment.paypal_sale_id || payment.paypal_transaction_id || "";
                    const isCurrentSub = payment.subscription_id === sub.id;
                    return (
                      <div
                        key={payment.id}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "stretch",
                          gap: 12,
                          padding: "14px 16px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 12,
                          borderLeftWidth: 3,
                          borderLeftColor: accent,
                          opacity: isCurrentSub ? 1 : 0.75,
                        }}
                      >
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.04em",
                                padding: "3px 8px",
                                borderRadius: 6,
                                background:
                                  payment.status === "COMPLETED"
                                    ? "rgba(87,242,135,0.15)"
                                    : payment.status === "REFUNDED"
                                      ? "rgba(250,166,26,0.15)"
                                      : "rgba(255,255,255,0.08)",
                                color:
                                  payment.status === "COMPLETED"
                                    ? "#57F287"
                                    : payment.status === "REFUNDED"
                                      ? "#FAA61A"
                                      : "#b9bbbe",
                              }}
                            >
                              {payment.status}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>${payment.amount}</span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "rgba(255,255,255,0.05)",
                                color: "#b9bbbe",
                              }}
                            >
                              {formatPlanCategory(payment.plan_category || "")}
                            </span>
                            <span style={{ fontSize: 12, color: "#72767d" }}>{format(new Date(payment.created_at), "MMM d, yyyy · h:mm a")}</span>
                          </div>
                          {txnId ? (
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                              <span className="font-mono" style={{ fontSize: 11, color: "#72767d", wordBreak: "break-all" }}>
                                {txnId}
                              </span>
                              <CopyButton text={txnId} label="transaction ID" />
                            </div>
                          ) : null}
                          {!isCurrentSub && (
                            <div style={{ fontSize: 11, color: "#72767d", marginTop: 6 }}>
                              From a different subscription record
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            flex: "0 1 auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            minWidth: "min(100%, 140px)",
                          }}
                        >
                          {payment.status === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => handleRefund(payment.id)}
                              disabled={refunding === payment.id}
                              style={{
                                width: "100%",
                                maxWidth: 160,
                                padding: "8px 14px",
                                background: "rgba(250,166,26,0.12)",
                                color: "#FAA61A",
                                border: "1px solid rgba(250,166,26,0.28)",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: refunding === payment.id ? "wait" : "pointer",
                                opacity: refunding === payment.id ? 0.7 : 1,
                              }}
                            >
                              {refunding === payment.id ? "Refunding…" : "Issue Refund"}
                            </button>
                          )}
                          {payment.status === "REFUNDED" && payment.refund_amount && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#FAA61A" }}>Refunded ${payment.refund_amount}</div>
                              <div style={{ fontSize: 11, color: "#72767d", marginTop: 4 }}>{format(new Date(payment.refunded_at), "MMM d, yyyy")}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
              );
            })()}
          </div>
        </div>

        <div className="space-y-6">
          <div style={{ ...glassStyle, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>
              Profile
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {sub.user?.avatar ? (
                <img
                  src={sub.user.avatar}
                  className="w-16 h-16 rounded-full shrink-0"
                  style={{ border: "2px solid rgba(88,101,242,0.35)", boxShadow: "0 0 0 4px rgba(88,101,242,0.08)" }}
                  alt=""
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-xl font-bold"
                  style={{ background: "#5865f2", boxShadow: "0 0 0 4px rgba(88,101,242,0.12)" }}
                >
                  {sub.user?.username?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#fff", wordBreak: "break-word" }}>{sub.user?.username || "Unknown user"}</div>
                {sub.user?.discord_handle && <div style={{ fontSize: 14, color: "#b9bbbe", marginTop: 4 }}>@{sub.user.discord_handle}</div>}
              </div>
            </div>
          </div>

          <div style={{ ...glassStyle, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>
              PayPal Info
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ ...labelStyle, textTransform: "none", letterSpacing: "normal", fontWeight: 500 }}>{isSubscriptionPayPal ? "Subscription ID" : "Order ID"}</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    color: "#b9bbbe",
                    wordBreak: "break-all",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                  }}
                >
                  {paypalPrimaryId || "N/A"}
                </div>
                {paypalPrimaryId ? <CopyButton text={paypalPrimaryId} label="PayPal ID" /> : null}
              </div>
              {sub.email && (
                <div>
                  <div style={labelStyle}>PayPal Email</div>
                  <div style={{ fontSize: 14, color: "#fff", wordBreak: "break-all" }}>{sub.email}</div>
                </div>
              )}
              {sub.payer_name && (
                <div>
                  <div style={labelStyle}>Payer Name</div>
                  <div style={{ fontSize: 14, color: "#fff" }}>{sub.payer_name}</div>
                </div>
              )}
            </div>

            {sub.paypal_subscription_id && (
              <a
                href={subscriptionDashboardUrl(sub.paypal_subscription_id)}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 20,
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "11px 16px",
                  background: "#0079C1",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View in PayPal Dashboard →
              </a>
            )}

            {!sub.paypal_subscription_id && sub.paypal_order_id && (
              <a
                href={paypalActivityUrl}
                target="_blank"
                rel="noreferrer"
                title="Open PayPal Activity to locate this order after signing in"
                style={{
                  marginTop: 20,
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "11px 16px",
                  background: "rgba(0,121,193,0.2)",
                  color: "#5eb8e8",
                  border: "1px solid rgba(0,121,193,0.35)",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Open PayPal Activity →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
