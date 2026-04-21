"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  plan_category: string | null;
  active: number;
  created_at: string;
};

type Toast = { id: number; message: string; type: "success" | "error" };
let toastId = 0;

const glassStyle: React.CSSProperties = {
  background: "radial-gradient(circle at 20% 50%, rgba(88,101,242,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(114,137,218,0.05) 0%, transparent 50%), color-mix(in srgb, var(--bg-secondary) 88%, var(--bg-primary))",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid var(--glass-border, rgba(255,255,255,0.06))",
  borderRadius: 16,
  boxShadow: "var(--glass-shadow, 0 4px 24px rgba(0,0,0,0.08))",
};

export default function AdminPromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [form, setForm] = useState({ code: "", discountPercent: 20, maxUses: "", maxUsesPerUser: "", planCategory: "" });

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  async function fetchPromos() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) setPromos(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }

  useEffect(() => { fetchPromos(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || form.discountPercent <= 0 || form.discountPercent > 100) {
      addToast("Invalid form — check code and discount %", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { code: form.code, discountPercent: form.discountPercent };
      if (form.maxUses) payload.maxUses = parseInt(form.maxUses, 10);
      if (form.maxUsesPerUser) payload.maxUsesPerUser = parseInt(form.maxUsesPerUser, 10);
      if (form.planCategory) payload.planCategory = form.planCategory;

      const res = await fetch("/api/admin/promo-codes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ code: "", discountPercent: 20, maxUses: "", maxUsesPerUser: "", planCategory: "" });
        fetchPromos();
        addToast(`Promo code ${form.code} created`, "success");
      } else {
        const d = await res.json();
        addToast(d.error || "Failed to create promo code", "error");
      }
    } catch { addToast("Failed to create promo code", "error"); } finally { setSubmitting(false); }
  };

  const toggleActive = async (id: string, currentStatus: number | boolean) => {
    const isActive = Boolean(currentStatus);
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !isActive }),
      });
      if (res.ok) {
        fetchPromos();
        addToast(isActive ? "Promo code deactivated" : "Promo code activated", "success");
      } else { addToast("Failed to update status", "error"); }
    } catch { addToast("Failed to update status", "error"); }
  };

  return (
    <div className="dashboard-wide" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Toasts */}
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: "12px 20px", borderRadius: 10, background: t.type === "success" ? "rgba(87,242,135,0.12)" : "rgba(237,66,69,0.12)", border: `1px solid ${t.type === "success" ? "rgba(87,242,135,0.25)" : "rgba(237,66,69,0.25)"}`, color: t.type === "success" ? "#57F287" : "#f87171", fontSize: 14, fontWeight: 500, backdropFilter: "blur(12px)", animation: "fadeIn 0.3s ease" }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard/subscriptions" style={{ color: "#5865f2", fontSize: 14, textDecoration: "none" }}>&larr; Back</Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>Promo Codes</h1>
            <p style={{ color: "#72767d", margin: "4px 0 0", fontSize: 14 }}>Manage discounts for subscriptions</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "8px 20px", background: showForm ? "rgba(255,255,255,0.04)" : "rgba(88,101,242,0.8)", color: "#fff", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {showForm ? "Cancel" : "Create Promo Code"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ ...glassStyle, padding: 24, marginBottom: 24, maxWidth: 640 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 16px" }}>New Promo Code</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Code</label>
                <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Discount %</label>
                <input type="number" required min="1" max="100" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: parseInt(e.target.value, 10) || 0 })} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Max Total Uses</label>
                <input type="number" min="1" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Max Uses per User</label>
                <input type="number" min="1" value={form.maxUsesPerUser} onChange={e => setForm({ ...form, maxUsesPerUser: e.target.value })} placeholder="Unlimited" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#b9bbbe", display: "block", marginBottom: 4 }}>Plan Restriction</label>
                <select value={form.planCategory} onChange={e => setForm({ ...form, planCategory: e.target.value })} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13 }}>
                  <option value="">Any Plan</option>
                  <option value="PREMIUM">Premium Only</option>
                  <option value="LEAK_PROTECTION">Leak Protection Only</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={submitting} style={{ padding: "8px 20px", background: "#57F287", color: "#111", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Creating..." : "Create Code"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ ...glassStyle, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Code", "Discount", "Uses", "Restrictions", "Created", "Status"].map(h => (
                <th key={h} style={{ padding: "14px 16px", fontSize: 11, fontWeight: 600, color: "#72767d", letterSpacing: "0.05em", textTransform: "uppercase" as const, textAlign: h === "Status" ? "right" as const : "left" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#72767d" }}>Loading...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#72767d" }}>No promo codes found.</td></tr>
            ) : promos.map(promo => {
              const isActive = Boolean(promo.active);
              return (
                <tr key={promo.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: isActive ? 1 : 0.5, transition: "all 0.15s" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 6 }}>{promo.code}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#57F287", fontWeight: 700, fontSize: 14 }}>{promo.discount_percent}% OFF</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 14, color: "#fff" }}>{promo.used_count} / {promo.max_uses || "∞"}</span>
                    {promo.max_uses && promo.used_count >= promo.max_uses && <div style={{ fontSize: 10, color: "#FAA61A", fontWeight: 700, marginTop: 2 }}>CAP REACHED</div>}
                    {promo.max_uses_per_user && <div style={{ fontSize: 10, color: "#72767d", marginTop: 2 }}>{promo.max_uses_per_user}x per user</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {promo.plan_category ? (
                      <span style={{ fontSize: 12, background: "rgba(155,89,182,0.15)", color: "#c084fc", padding: "4px 8px", borderRadius: 6 }}>{promo.plan_category.replace("_", " ")}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#72767d" }}>Any</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#b9bbbe" }}>{format(new Date(promo.created_at), "MMM d, yyyy")}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button onClick={() => toggleActive(promo.id, promo.active)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, border: `1px solid ${isActive ? "rgba(237,66,69,0.2)" : "rgba(87,242,135,0.2)"}`, background: isActive ? "rgba(237,66,69,0.08)" : "rgba(87,242,135,0.08)", color: isActive ? "#ED4245" : "#57F287", cursor: "pointer" }}>
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
