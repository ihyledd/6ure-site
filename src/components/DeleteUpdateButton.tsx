"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteUpdateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!confirm("Delete this announcement?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/updates/${id}/delete`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="dashboard-btn dashboard-btn-ghost dashboard-btn-sm dashboard-btn-danger"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
