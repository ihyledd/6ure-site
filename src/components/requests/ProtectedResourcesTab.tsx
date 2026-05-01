"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProtectedResource = {
  id: number;
  name: string | null;
  editor_name: string | null;
  place_url: string | null;
  thumbnail_url: string | null;
  status: string | null;
  hidden: number | boolean | null;
  is_protected: number | boolean | null;
  leaked_at: string | null;
  download_count: number | null;
};

type ProtectedResourcesResponse = {
  items?: ProtectedResource[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    protectedCount: number;
    protectedHiddenCount: number;
    visibleProtectedCount: number;
  };
  error?: string;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 25;

function boolish(value: number | boolean | null | undefined) {
  return value === true || value === 1;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function ProtectedResourcesTab() {
  const [items, setItems] = useState<ProtectedResource[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [runningAction, setRunningAction] = useState<"import" | "sync" | "import-sync" | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    protectedCount: 0,
    protectedHiddenCount: 0,
    visibleProtectedCount: 0,
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort: "recent",
      order: "desc",
    });
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [page, search]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/protection/resources?${queryString}`);
      const data: ProtectedResourcesResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load protected resources");
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.pagination?.total ?? 0));
      setTotalPages(Math.max(1, Number(data.pagination?.totalPages ?? 1)));
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load protected resources");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const runImportProtected = async () => {
    const res = await fetch("/api/admin/resources/import-protected", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Protected YAML import failed");
    return data.message || `Imported ${(data.added ?? 0) + (data.updated ?? 0)} protected resource(s).`;
  };

  const runSyncProtection = async () => {
    const res = await fetch("/api/cron/sync-protection", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Protection sync failed");
    return `Synced ${data.rowsAffected ?? 0} resource row(s).`;
  };

  const runAction = async (action: "import" | "sync" | "import-sync") => {
    setRunningAction(action);
    setFeedback(null);
    try {
      const messages: string[] = [];
      if (action === "import" || action === "import-sync") {
        messages.push(await runImportProtected());
      }
      if (action === "sync" || action === "import-sync") {
        messages.push(await runSyncProtection());
      }
      setFeedback({ type: "success", message: messages.join(" ") });
      await loadResources();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Protection action failed",
      });
    } finally {
      setRunningAction(null);
    }
  };

  const patchResource = async (resource: ProtectedResource, body: { is_protected?: boolean; hidden?: boolean }) => {
    setUpdatingId(resource.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/protection/resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update resource");
      await loadResources();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update resource",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="dashboard-card">
      <div className="protection-manage-section-header">
        <h2 className="dashboard-card-title">Protected Resources</h2>
        <p className="dashboard-card-desc">
          Database rows marked <code>is_protected=1</code>. Import protected YAML files and sync protection rules to keep matching resources hidden.
        </p>
        <div className="protection-manage-header-actions">
          <button
            type="button"
            className="dashboard-btn dashboard-btn-primary protection-manage-btn-add-link"
            onClick={() => runAction("import-sync")}
            disabled={runningAction !== null}
          >
            {runningAction === "import-sync" ? "Importing & syncing..." : "Import & sync"}
          </button>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-ghost protection-manage-btn-refresh"
            onClick={() => runAction("import")}
            disabled={runningAction !== null}
          >
            {runningAction === "import" ? "Importing..." : "Import protected"}
          </button>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-ghost protection-manage-btn-refresh"
            onClick={() => runAction("sync")}
            disabled={runningAction !== null}
          >
            {runningAction === "sync" ? "Syncing..." : "Sync protection"}
          </button>
        </div>
        {feedback && (
          <p className={`protection-manage-refresh-message ${feedback.type === "error" ? "protection-manage-error-text" : ""}`} role="status">
            {feedback.message}
          </p>
        )}
      </div>

      <div className="protection-manage-resource-stats">
        <MiniStat label="Protected" value={stats.protectedCount} />
        <MiniStat label="Hidden" value={stats.protectedHiddenCount} />
        <MiniStat label="Visible" value={stats.visibleProtectedCount} />
      </div>

      <div className="protection-manage-search">
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search protected resources by name, editor, or URL..."
          className="protection-manage-search-input"
          aria-label="Search protected resources"
        />
      </div>

      {error ? (
        <div className="protection-manage-links-error">
          <p className="dashboard-empty">{error}</p>
          <button type="button" className="dashboard-btn dashboard-btn-ghost" onClick={loadResources}>Retry</button>
        </div>
      ) : loading ? (
        <p className="dashboard-empty">Loading protected resources...</p>
      ) : items.length === 0 ? (
        <p className="dashboard-empty">
          No protected resources found. Run Import & sync to populate <code>is_protected</code> rows from the protected YAML folder and protection rules.
        </p>
      ) : (
        <>
          <div className="protection-manage-resources-list">
            {items.map((resource) => {
              const hidden = boolish(resource.hidden) || resource.status === "Hidden";
              return (
                <article key={resource.id} className="protection-manage-resource-item">
                  <div className="protection-manage-resource-thumb">
                    {resource.thumbnail_url ? (
                      <Image src={resource.thumbnail_url} alt="" width={58} height={58} unoptimized />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                  <div className="protection-manage-resource-main">
                    <div className="protection-manage-resource-title-row">
                      <Link href={`/resources/${resource.id}`} target="_blank" className="protection-manage-resource-title">
                        {resource.name || `Resource #${resource.id}`}
                      </Link>
                      <span className={`protection-manage-resource-badge ${hidden ? "" : "warning"}`}>
                        {hidden ? "Hidden" : "Visible"}
                      </span>
                    </div>
                    <div className="protection-manage-resource-meta">
                      <span>{resource.editor_name || "Unknown editor"}</span>
                      <span>{formatDate(resource.leaked_at)}</span>
                      <span>{resource.download_count ?? 0} downloads</span>
                    </div>
                    {resource.place_url && (
                      <a href={resource.place_url} target="_blank" rel="noopener noreferrer" className="protection-manage-resource-url">
                        {resource.place_url}
                      </a>
                    )}
                  </div>
                  <div className="protection-manage-resource-actions">
                    <button
                      type="button"
                      className="dashboard-btn dashboard-btn-ghost"
                      onClick={() => patchResource(resource, { hidden: !hidden })}
                      disabled={updatingId === resource.id}
                    >
                      {hidden ? "Unhide" : "Hide"}
                    </button>
                    <button
                      type="button"
                      className="protection-manage-btn-delete"
                      onClick={() => {
                        if (confirm("Remove protection from this resource and make it visible?")) {
                          patchResource(resource, { is_protected: false });
                        }
                      }}
                      disabled={updatingId === resource.id}
                    >
                      Unprotect
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="protection-manage-pagination">
            <span>Showing {items.length} of {total} protected resources</span>
            <div>
              <button type="button" className="dashboard-btn dashboard-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </button>
              <span>Page {page} / {totalPages}</span>
              <button type="button" className="dashboard-btn dashboard-btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="protection-manage-resource-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
