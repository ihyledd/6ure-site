"use client";

import { useState, useEffect, useCallback } from "react";

interface ResourceSettings {
  password: string | null;
  link_expiry: string;
  bypass_staff: boolean;
  bypass_booster: boolean;
  share_expiry_hours: number;
}

export function ResourcesSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [linkExpiry, setLinkExpiry] = useState("1 hour");
  const [bypassStaff, setBypassStaff] = useState(true);
  const [bypassBooster, setBypassBooster] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/resources-settings");
      if (!res.ok) throw new Error("Failed to load");
      const data: ResourceSettings = await res.json();
      setPassword(data.password ?? "");
      setLinkExpiry(data.link_expiry || "1 hour");
      setBypassStaff(data.bypass_staff);
      setBypassBooster(data.bypass_booster);
    } catch {
      setError("Failed to load settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/resources-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim() || null,
          link_expiry: linkExpiry.trim(),
          bypass_staff: bypassStaff,
          bypass_booster: bypassBooster,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="dashboard-card" style={{ padding: 40, textAlign: "center" }}>
        <div className="dashboard-spinner" />
        <p style={{ color: "var(--text-tertiary)", marginTop: 12 }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Download Password */}
      <div className="dashboard-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Download Password
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 16px" }}>
          Password required for non-premium users. Same as Discord <code>/setup → Password</code>. Leave empty to disable.
        </p>

        <div style={{ position: "relative", maxWidth: 400 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="No password set (ad campaign only)"
            style={{ width: "100%", paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-tertiary)", fontSize: 13, padding: 4,
            }}
            title={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {password && (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
            Current: <code style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: 4 }}>{password}</code>
          </p>
        )}
      </div>

      {/* Bypass Settings */}
      <div className="dashboard-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Password Bypass
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 16px" }}>
          Choose which roles skip the download password.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{
              width: 40, height: 22, borderRadius: 11, position: "relative",
              background: bypassStaff ? "#5865F2" : "var(--bg-tertiary)",
              border: bypassStaff ? "none" : "1px solid var(--border)",
              transition: "background 0.2s", display: "inline-block", flexShrink: 0,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: bypassStaff ? 20 : 2,
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </span>
            <input
              type="checkbox"
              checked={bypassStaff}
              onChange={(e) => setBypassStaff(e.target.checked)}
              style={{ display: "none" }}
            />
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Staff bypass</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
                Staff members get downloads without password
              </span>
            </div>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{
              width: 40, height: 22, borderRadius: 11, position: "relative",
              background: bypassBooster ? "#f47fff" : "var(--bg-tertiary)",
              border: bypassBooster ? "none" : "1px solid var(--border)",
              transition: "background 0.2s", display: "inline-block", flexShrink: 0,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: bypassBooster ? 20 : 2,
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </span>
            <input
              type="checkbox"
              checked={bypassBooster}
              onChange={(e) => setBypassBooster(e.target.checked)}
              style={{ display: "none" }}
            />
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Booster bypass</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
                Server boosters get downloads without password
              </span>
            </div>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: 0.6 }}>
            <span style={{
              width: 40, height: 22, borderRadius: 11, position: "relative",
              background: "#eab308", display: "inline-block", flexShrink: 0,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", background: "white",
                position: "absolute", top: 2, left: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </span>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Premium bypass</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
                Always enabled — premium members always skip password
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Link Expiry */}
      <div className="dashboard-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Link Expiry
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 16px" }}>
          How long download links stay valid. Uses the same format as the Discord bot.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 500 }}>
          {["30 minutes", "1 hour", "2 hours", "6 hours", "12 hours", "24 hours"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLinkExpiry(preset)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: linkExpiry === preset ? "1px solid var(--discord-blurple)" : "1px solid var(--border)",
                background: linkExpiry === preset ? "rgba(88, 101, 242, 0.1)" : "var(--bg-tertiary)",
                color: linkExpiry === preset ? "var(--discord-blurple)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            value={linkExpiry}
            onChange={(e) => setLinkExpiry(e.target.value)}
            placeholder="e.g. 1 hour"
            style={{ maxWidth: 200 }}
          />
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            Custom value (Skript timespan format, e.g. &quot;1.5 hours&quot;, &quot;30 minutes&quot;)
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="dashboard-card" style={{
        background: "rgba(88, 101, 242, 0.06)",
        border: "1px solid rgba(88, 101, 242, 0.15)",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong>These settings are shared with the Discord bot.</strong> Changes here are written to{" "}
            <code style={{ background: "var(--bg-tertiary)", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>settings.yml</code>{" "}
            — the same file the <code>/setup</code> command reads. Both the website and the bot will use the updated values instantly.
            <br />
            <br />
            <strong>Download shares</strong> are created via SFTPGo with <strong>max 1 use</strong> per link.
            After downloading, users must generate a new link.
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="dashboard-btn dashboard-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
            ✓ Settings saved successfully
          </span>
        )}
        {error && (
          <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
            ✕ {error}
          </span>
        )}
      </div>
    </div>
  );
}
