"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualUpdateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const body = (form.elements.namedItem("body") as HTMLTextAreaElement).value.trim();
    if (!title) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body: body || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      form.reset();
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
      <div className="dashboard-form-group">
        <input
          type="text"
          name="title"
          placeholder="Title"
          required
          style={{ maxWidth: 400 }}
        />
      </div>
      <div className="dashboard-form-group">
        <textarea
          name="body"
          placeholder="Optional description"
          rows={2}
          style={{ maxWidth: 500, resize: "vertical" }}
        />
      </div>
      <button type="submit" className="dashboard-btn dashboard-btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
        {loading ? "Adding…" : "Add update"}
      </button>
    </form>
  );
}
