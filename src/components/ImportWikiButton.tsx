"use client";

import { useState } from "react";

export function ImportWikiButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: string[]; updated: string[]; errors: { path: string; error: string }[] } | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/import-6ure-wiki", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (e) {
      setResult({ created: [], updated: [], errors: [{ path: "", error: String(e) }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="dashboard-btn dashboard-btn-ghost"
      >
        {loading ? "Importing…" : "Import from 6ure-wiki (GitHub)"}
      </button>
      {result && (
        <div className="wiki-card" style={{ marginTop: 12, padding: 16 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Created: {result.created.length} · Updated: {result.updated.length}
            {result.errors.length > 0 ? ` · Errors: ${result.errors.length}` : ""}
          </p>
          {result.errors.length > 0 && (
            <ul style={{ fontSize: 13, color: "var(--error)", margin: 0, paddingLeft: 20 }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e.path}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
