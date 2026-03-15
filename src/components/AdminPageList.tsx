"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminBulkActions } from "@/components/AdminBulkActions";

type Page = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  updatedAt: Date;
};

export function AdminPageList({ pages }: { pages: Page[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pages.length) setSelected(new Set());
    else setSelected(new Set(pages.map((p) => p.id)));
  };

  return (
    <div className="wiki-card">
      <AdminBulkActions selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} />
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "var(--glass-border)" }}>
          <input
            type="checkbox"
            checked={selected.size === pages.length && pages.length > 0}
            onChange={toggleAll}
            aria-label="Select all"
          />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Select all</span>
        </li>
        {pages.map((p) => (
          <li
            key={p.id}
            className="wiki-list-card"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                aria-label={`Select ${p.title}`}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/wiki/p/${p.slug}`} style={{ fontWeight: 600 }}>
                    {p.title}
                  </Link>
                  {!p.published ? (
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "var(--glass-tertiary-bg)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Draft
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }} suppressHydrationWarning>
                  Updated{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: "UTC",
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  }).format(p.updatedAt)}
                </div>
              </div>
            </div>
            <Link
              href={`/dashboard/pages/${p.id}/edit`}
              className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
