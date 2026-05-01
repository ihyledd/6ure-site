"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Form = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  _count: { submissions: number };
  updatedAt: string;
};

export default function AdminFormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = () =>
    fetch("/api/admin/forms")
      .then((r) => r.json())
      .then((d) => {
        setForms(d.forms ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = async () => {
    const res = await fetch("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Form", description: "" }),
    });
    if (res.ok) {
      const { form } = await res.json();
      showToast("Form created.", "success");
      window.location.href = `/admin/forms/${form.id}/edit`;
    } else {
      showToast("Failed to create form.", "error");
    }
  };

  if (loading)
    return (
      <div style={{ padding: 24, color: "var(--text-tertiary)" }}>
        Loading…
      </div>
    );

  return (
    <div style={{ marginBottom: 48 }}>
      <div
        className="dashboard-section-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2>Application Forms</h2>
          <p>Build Google Forms–style application forms. Add sections and questions, set limits, and publish.</p>
        </div>
        <button
          type="button"
          className="dashboard-btn dashboard-btn-primary"
          onClick={handleCreate}
        >
          Create form
        </button>
      </div>

      {toast && (
        <div className={`dashboard-toast dashboard-toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <div className="dashboard-card" style={{ padding: 0 }}>
        {forms.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-tertiary)", fontSize: 14 }}>
            No forms yet. Create one to get started.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {forms.map((f) => (
              <li
                key={f.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 24px",
                  borderBottom:
                    "1px solid var(--border, rgba(255,255,255,.06))",
                }}
              >
                <div>
                  <Link
                    href={`/admin/forms/${f.id}/edit`}
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--text-primary)",
                    }}
                  >
                    {f.title}
                  </Link>
                  <span style={{ marginLeft: 8, fontSize: 13, color: "var(--text-tertiary)" }}>
                    {f._count.submissions} submission{f._count.submissions !== 1 ? "s" : ""}
                    {f.isActive ? (
                      <span className="dashboard-badge dashboard-badge-success" style={{ marginLeft: 8 }}>
                        Active
                      </span>
                    ) : null}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Link
                    href={`/admin/forms/${f.id}/edit`}
                    className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/apply?form=${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
                  >
                    Preview
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
