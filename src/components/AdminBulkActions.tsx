"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  selectedIds: string[];
  onClear: () => void;
};

export function AdminBulkActions({ selectedIds, onClear }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async (action: string, value?: boolean) => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action, value }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClear();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="admin-bulk-bar">
      <span className="admin-bulk-count">{selectedIds.length} selected</span>
      <div className="admin-bulk-btns">
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("featured", true)} disabled={loading}>Featured</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("featured", false)} disabled={loading}>Unfeature</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("hidden", true)} disabled={loading}>Hide</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("hidden", false)} disabled={loading}>Unhide</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("publish")} disabled={loading}>Publish</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm" onClick={() => run("unpublish")} disabled={loading}>Draft</button>
        <button type="button" className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm dashboard-btn-danger" onClick={() => run("delete")} disabled={loading}>Delete</button>
      </div>
      <button type="button" onClick={onClear} className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm admin-bulk-clear">Clear</button>
    </div>
  );
}
