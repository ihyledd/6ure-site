"use client";

import { useEffect, useState } from "react";

type Totals = {
  total?: number;
  missing_channel?: number;
  missing_message?: number;
  protected_count?: number;
  hidden_count?: number;
};
type EditorBreakdown = { editor_name: string; missing: number };

type RestoreResult = {
  success?: boolean;
  scope?: "all" | "editor";
  editor?: string | null;
  processedEditors?: number;
  added?: number;
  updated?: number;
  skippedProtected?: number;
  failed?: { editor: string; error: string }[];
  message?: string;
  error?: string;
};

export function ResourceRestoreClient() {
  const [totals, setTotals] = useState<Totals>({});
  const [editors, setEditors] = useState<EditorBreakdown[]>([]);
  const [yamlAvailable, setYamlAvailable] = useState(true);
  const [yamlEditorCount, setYamlEditorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"all" | "editor" | null>(null);
  const [editorInput, setEditorInput] = useState("");
  const [unhide, setUnhide] = useState(false);
  const [feedback, setFeedback] = useState<RestoreResult | null>(null);
  const [protectedStats, setProtectedStats] = useState<{ yamlAvailable: boolean; editorCount: number; alreadyProtectedRows: number; path: string } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  async function loadProtectedStats() {
    try {
      const res = await fetch("/api/admin/resources/import-protected");
      if (res.ok) setProtectedStats(await res.json());
    } catch { /* ignore */ }
  }

  async function importProtected() {
    if (!confirm("Import every YAML in the protected folder into the database with is_protected=1, hidden=1?")) return;
    setImportBusy(true);
    setImportFeedback(null);
    try {
      const res = await fetch("/api/admin/resources/import-protected", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setImportFeedback(`Error: ${data?.error || "Import failed"}`);
      } else {
        setImportFeedback(data?.message || `Imported ${data?.added ?? 0} new + ${data?.updated ?? 0} updated.`);
        await Promise.all([load(), loadProtectedStats()]);
      }
    } catch (e: any) {
      setImportFeedback(`Error: ${e?.message || "Network error"}`);
    } finally {
      setImportBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resources/restore");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to load restore data");
      } else {
        setTotals(data.totals || {});
        setEditors(data.editors || []);
        setYamlAvailable(!!data.yamlAvailable);
        setYamlEditorCount(Number(data.yamlEditorCount || 0));
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadProtectedStats();
  }, []);

  async function trigger(scope: "all" | "editor", editor?: string) {
    setBusy(scope);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/resources/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, editor, unhide }),
      });
      const data: RestoreResult = await res.json();
      if (!res.ok) {
        setFeedback({ error: data?.error || "Restore failed" });
      } else {
        setFeedback(data);
        // Reload stats so admin sees the impact immediately.
        load();
      }
    } catch (e: any) {
      setFeedback({ error: e?.message || "Network error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-resource-restore">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Restore Resources</h1>
          <p className="dash-subtitle">Re-import resource data from the source YAML files into the website database.</p>
        </div>
      </div>

      {!yamlAvailable && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(237, 66, 69, 0.1)", color: "#ed4245", fontSize: 14, border: "1px solid rgba(237, 66, 69, 0.3)" }}>
          <strong>YAML directory unavailable.</strong> Restore needs read access to the editor YAML files. Set <code>LEAKS_DATA_PATH</code> if they live elsewhere.
        </div>
      )}

      {feedback && (
        feedback.error ? (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(237, 66, 69, 0.1)", color: "#ed4245", fontSize: 14, border: "1px solid rgba(237, 66, 69, 0.3)" }}>
            <i className="bi bi-exclamation-triangle" /> {feedback.error}
          </div>
        ) : (
          <div style={{ marginBottom: 20, padding: "16px", borderRadius: 10, background: "rgba(45, 199, 112, 0.08)", color: "#2dc770", fontSize: 14, border: "1px solid rgba(45, 199, 112, 0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <i className="bi bi-check-circle-fill" />
              <strong style={{ color: "#fff" }}>Restore complete</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <Mini label="Editors processed" value={feedback.processedEditors ?? 0} />
              <Mini label="Resources added" value={feedback.added ?? 0} highlight />
              <Mini label="Resources updated" value={feedback.updated ?? 0} />
              <Mini label="Protected (skipped)" value={feedback.skippedProtected ?? 0} muted />
            </div>
            {feedback.failed && feedback.failed.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", color: "#faa61a" }}>{feedback.failed.length} editor(s) failed</summary>
                <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 12, color: "#aaa" }}>
                  {feedback.failed.slice(0, 20).map((f, i) => (
                    <li key={i}><strong>{f.editor}</strong>: {f.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )
      )}

      {error && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(237, 66, 69, 0.1)", color: "#ed4245", fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        <Stat label="Total Resources" value={totals.total ?? 0} icon="bi-file-earmark-zip" color="#fff" />
        <Stat label="Missing Channel" value={totals.missing_channel ?? 0} icon="bi-collection" color="#faa61a" />
        <Stat label="Missing Message" value={totals.missing_message ?? 0} icon="bi-chat-text" color="#faa61a" />
        <Stat label="Hidden" value={totals.hidden_count ?? 0} icon="bi-eye-slash" color="#888" />
        <Stat label="Protected (skipped)" value={totals.protected_count ?? 0} icon="bi-shield-lock" color="#ed4245" />
        <Stat label="YAML editors" value={yamlEditorCount} icon="bi-folder2-open" color="#5865f2" />
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#ddd" }}>
          <input
            type="checkbox"
            checked={unhide}
            onChange={(e) => setUnhide(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <span>Also <strong>unhide</strong> resources that were hidden (still skips protected ones)</span>
        </label>
      </div>

      <div style={{ background: "rgba(237, 66, 69, 0.04)", border: "1px solid rgba(237, 66, 69, 0.18)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-shield-lock" style={{ color: "#ed4245" }} /> Import protected YAML folder
        </h2>
        <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          One-click migration of every <code>.yml</code> file in the protected folder
          ({protectedStats?.path ?? "/home/6ure/plugins/Skript/scripts/Data/protected"}) into the database.
          Imported rows are marked <code>is_protected=1, hidden=1, status=&apos;Hidden&apos;</code> and are excluded
          from public listings, downloads, and restore operations.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>
            YAML files in folder: <strong style={{ color: "#fff" }}>{protectedStats?.editorCount ?? "—"}</strong>
          </span>
          <span style={{ fontSize: 12, color: "#aaa" }}>
            Currently protected rows in DB: <strong style={{ color: "#fff" }}>{protectedStats?.alreadyProtectedRows ?? "—"}</strong>
          </span>
        </div>
        <button
          className="dash-btn"
          onClick={importProtected}
          disabled={importBusy || !protectedStats?.yamlAvailable}
          style={{ background: "#ed4245", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: importBusy ? "wait" : "pointer" }}
        >
          {importBusy ? "Importing…" : "Import protected YAML files"}
        </button>
        {importFeedback && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: importFeedback.startsWith("Error") ? "rgba(237, 66, 69, 0.1)" : "rgba(45, 199, 112, 0.1)", color: importFeedback.startsWith("Error") ? "#ed4245" : "#2dc770" }}>
            {importFeedback}
          </div>
        )}
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 8 }}>Run full restore</h2>
        <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Re-imports every editor YAML file into the database. Adds back any leaks that were deleted from the
          website but still exist in the source files, and refreshes <code>file_path</code>, <code>download_count</code>,
          Discord IDs, and date for existing rows. Protected resources are skipped entirely.
        </p>
        <button
          className="dash-btn dash-btn-primary"
          disabled={busy !== null || loading || !yamlAvailable}
          onClick={() => trigger("all")}
        >
          {busy === "all" ? "Restoring…" : "Restore all from YAML"}
        </button>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 8 }}>Restore single editor</h2>
        <p style={{ color: "#aaa", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Editor name must match a YAML filename (case-insensitive, without <code>.yml</code>).
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Editor name"
            value={editorInput}
            onChange={(e) => setEditorInput(e.target.value)}
            list="restore-editor-suggestions"
            style={{ flex: 1, minWidth: 220, padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none" }}
          />
          <datalist id="restore-editor-suggestions">
            {editors.slice(0, 50).map(e => <option key={e.editor_name} value={e.editor_name} />)}
          </datalist>
          <button
            className="dash-btn dash-btn-primary"
            disabled={busy !== null || !editorInput.trim() || !yamlAvailable}
            onClick={() => trigger("editor", editorInput.trim())}
          >
            {busy === "editor" ? "Restoring…" : "Restore this editor"}
          </button>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, color: "#fff", marginBottom: 16 }}>Top editors with missing channels/messages</h2>
        {loading ? (
          <p style={{ color: "#aaa" }}>Loading…</p>
        ) : editors.length === 0 ? (
          <p style={{ color: "#aaa" }}>Every active resource already has channel and message IDs.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {editors.map(e => (
              <button
                key={e.editor_name}
                onClick={() => setEditorInput(e.editor_name)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, cursor: "pointer", color: "inherit", textAlign: "left" }}
                title="Click to use this editor name above"
              >
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.editor_name}</span>
                <span style={{ color: "#faa61a", fontSize: 13, fontWeight: 700 }}>{e.missing}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <i className={`bi ${icon}`} style={{ color, fontSize: 16 }} />
        <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Mini({ label, value, highlight, muted }: { label: string; value: number | string; highlight?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: muted ? "#666" : "#aaa", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? "#2dc770" : muted ? "#aaa" : "#fff" }}>{value}</div>
    </div>
  );
}
