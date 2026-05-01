"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SettingsForm({ discordUrl }: { discordUrl: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState(discordUrl);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_url: url.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="dashboard-form-group">
      <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
        Discord invite / server URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://discord.gg/..."
        style={{ width: "100%", marginBottom: 16 }}
      />
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>
        Leave empty to hide the Discord icon from the header.
      </p>
      <button type="submit" className="dashboard-btn dashboard-btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
