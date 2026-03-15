"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Submission = {
  id: string;
  formId: string;
  userId: string;
  username: string | null;
  status: string;
  answers: Record<string, unknown>;
  createdAt: string;
  respondedAt: string | null;
  form: {
    id: string;
    title: string;
    fields?: { id: string; label: string }[];
    sections?: { fields: { id: string; label: string }[] }[];
  };
};

type Form = {
  id: string;
  title: string;
  isActive: boolean;
  _count: { submissions: number };
};

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLabelMap(form: { fields?: { id: string; label: string }[]; sections?: { fields: { id: string; label: string }[] }[] }): Map<string, string> {
  const allFields = [
    ...(form?.fields ?? []),
    ...(form?.sections ?? []).flatMap((s) => s.fields),
  ];
  return new Map(allFields.map((f) => [f.id, f.label]));
}

function getDisplayEmail(answers: Record<string, unknown>): string {
  const isEmail = (v: unknown): v is string =>
    typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  for (const k of ["email", "Email"]) {
    if (isEmail(answers[k])) return answers[k] as string;
  }
  for (const v of Object.values(answers)) {
    if (isEmail(v)) return v;
  }
  return "-";
}

export default function AdminApplicationsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = () =>
    Promise.all([
      fetch(`/api/admin/forms/submissions?showResolved=${showResolved}`).then((r) => r.json()),
      fetch("/api/admin/forms").then((r) => r.json()),
    ]).then(([subData, formsData]) => {
      setSubmissions(subData.submissions ?? []);
      setForms(formsData.forms ?? []);
      setLoading(false);
    })
    .catch(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    reload();
  }, [showResolved]);

  const toggleFormActive = async (form: Form) => {
    const res = await fetch(`/api/admin/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !form.isActive }),
    });
    if (res.ok) {
      showToast(
        form.isActive ? "Applications closed for this form." : "Applications opened for this form.",
        "success"
      );
      setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, isActive: !f.isActive } : f)));
    } else showToast("Failed to update.", "error");
  };

  const handleAction = async (subId: string, action: "accept" | "reject") => {
    if (action === "reject" && !confirm("Reject this application?")) return;
    const res = await fetch(`/api/admin/forms/submissions/${subId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      showToast(`Application ${action === "accept" ? "accepted" : "rejected"}.`, "success");
      reload();
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Action failed.", "error");
    }
  };

  if (loading) return <div style={{ padding: 24, color: "var(--text-tertiary)" }}>Loading…</div>;

  const pending = submissions.filter((s) => s.status === "pending").length;

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <div>
          <h2>
            Applications
            {pending > 0 && (
              <span
                className="dashboard-badge dashboard-badge-pending"
                style={{ marginLeft: 8, fontSize: 14 }}
              >
                {pending} pending
              </span>
            )}
          </h2>
          <p>Review applications submitted through the apply forms.</p>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      {toast && <div className={`dashboard-toast dashboard-toast-${toast.type}`}>{toast.msg}</div>}

      {forms.length > 0 && (
        <div className="dashboard-card" style={{ marginBottom: 24 }}>
          <h3 className="dashboard-card-title">Open / Close applications</h3>
          <p className="dashboard-card-desc">
            Enable or disable forms so users can apply. When closed, the form is hidden from /apply.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {forms.map((form) => (
              <li
                key={form.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border, rgba(255,255,255,.06))",
                }}
              >
                <div style={{ flex: 1 }}>
                  <Link
                    href={`/dashboard/forms/${form.id}/edit`}
                    style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {form.title}
                  </Link>
                  <span style={{ marginLeft: 8, fontSize: 13, color: "var(--text-tertiary)" }}>
                    {form._count.submissions} submission{form._count.submissions !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="dashboard-form-group-toggle-wrap">
                  <label className="dashboard-toggle-label" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={() => toggleFormActive(form)}
                      className="dashboard-toggle-input"
                    />
                    <span className="dashboard-toggle-track" />
                    <span>{form.isActive ? "Open" : "Closed"}</span>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="dashboard-card">
          <p className="dashboard-empty">
            {showResolved ? "No applications yet." : "No pending applications."}
          </p>
        </div>
      ) : (
        submissions.map((s) => {
          const answers = (s.answers ?? {}) as Record<string, unknown>;
          const labelMap = getLabelMap(s.form);
          const allFieldIds = [
            ...(s.form.fields ?? []).map((f) => f.id),
            ...(s.form.sections ?? []).flatMap((sec) => sec.fields.map((f) => f.id)),
          ];
          const detailEntries = [...allFieldIds, ...Object.keys(answers).filter((k) => !allFieldIds.includes(k))]
            .filter((key) => answers[key] != null)
            .map((key) => ({
              key,
              label: labelMap.get(key) ?? formatLabel(key),
              value: answers[key],
            }));
          return (
            <div key={s.id} className="dashboard-card dashboard-card-app">
              <div className="dashboard-app-header">
                <span className="dashboard-app-position">{s.form.title}</span>
                <span className="dashboard-app-user">
                  {String(answers.discord_username ?? answers.discord_user_id ?? s.username ?? s.userId ?? "")}
                </span>
                <span className={`dashboard-badge dashboard-badge-${s.status}`}>{s.status}</span>
                {s.status === "pending" && (
                  <div className="dashboard-list-actions">
                    <button
                      className="dashboard-btn dashboard-btn-primary dashboard-btn-sm"
                      onClick={() => handleAction(s.id, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className="dashboard-btn dashboard-btn-danger dashboard-btn-sm"
                      onClick={() => handleAction(s.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
              <div className="dashboard-app-meta">
                {s.createdAt} · Email: {getDisplayEmail(answers)}
              </div>
              <details>
                <summary className="dashboard-app-toggle">View details</summary>
                <div className="dashboard-app-embed">
                  {detailEntries.map(({ key, label, value }) => (
                    <div key={key} className="dashboard-app-field">
                      <span className="dashboard-app-field-label">{label}</span>
                      <span className="dashboard-app-field-value">
                        {Array.isArray(value) ? (value as string[]).join(", ") : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
                    onClick={async () => {
                      if (!confirm("Reset cooldown so this user can apply again?")) return;
                      const res = await fetch(
                        `/api/admin/forms/submissions/${s.id}/reset-cooldown`,
                        { method: "POST" }
                      );
                      if (res.ok) {
                        showToast("Cooldown reset.", "success");
                      } else showToast("Failed to reset cooldown.", "error");
                    }}
                  >
                    Reset cooldown
                  </button>
                </div>
              </details>
            </div>
          );
        })
      )}
    </div>
  );
}
