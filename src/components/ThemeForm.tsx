"use client";

import { useState, useEffect } from "react";
import type { ThemeSettings } from "@/lib/site-settings";

function SnowflakeIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden>
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2zm0 20l-1.5-5.5L5 15l5.5-1.5L12 8l1.5 5.5L19 15l-5.5 1.5L12 22zm-8-8l5.5-1.5L9 5l1.5 5.5L16 12l-5.5 1.5L9 19l-1.5-5.5L2 12zm20 0l-5.5 1.5L15 19l-1.5-5.5L8 12l5.5-1.5L15 5l1.5 5.5L22 12z" />
    </svg>
  );
}

function LeafIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={style} aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.39-2.5c.5.12 1 .18 1.5.18C17.33 19.68 21 15.77 21 11c0-1.5-.4-2.9-1.1-4.1-.3-.5-.7-.9-1.1-1.3-.4-.4-.8-.7-1.2-.9-.5-.3-1-.5-1.5-.7z" />
    </svg>
  );
}

const THEMES = [
  { id: "default", name: "Default", description: "Blurple accents, dark UI", previewClass: "theme-preview-default" },
  { id: "winter", name: "Winter", description: "Ice blue, snow & aurora", previewClass: "theme-preview-winter" },
  { id: "spring", name: "Spring", description: "Soft greens & blossom", previewClass: "theme-preview-spring" },
] as const;

const DEFAULT_THEME: ThemeSettings = {
  theme_active: "default",
  theme_winter_snow_enabled: "true",
  theme_winter_snow_intensity: "50",
  theme_winter_frost_borders: "true",
  theme_winter_blue_tint: "true",
  theme_winter_snowflake_cursor: "false",
  theme_winter_aurora_bg: "true",
  theme_spring_green_tint: "true",
  theme_spring_blossom_glow: "true",
  theme_spring_leaf_cursor: "false",
};

function Toggle({ on, onClick, "aria-label": ariaLabel }: { on: boolean; onClick: () => void; "aria-label": string }) {
  return (
    <button
      type="button"
      className={`dashboard-toggle ${on ? "active" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="dashboard-toggle-thumb" />
    </button>
  );
}

export function ThemeForm({ initial }: { initial: ThemeSettings }) {
  const [form, setForm] = useState<ThemeSettings>({ ...DEFAULT_THEME, ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...DEFAULT_THEME, ...initial, ...prev }));
  }, [initial.theme_active, initial.theme_winter_snow_enabled]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Themes</h2>
        <p>Choose the site-wide theme. This applies to all visitors.</p>
      </div>

      <div className="dashboard-card dashboard-card-full">
        <h3 className="dashboard-card-title">Theme gallery</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
          Choose the site-wide theme. This applies to all visitors. Preview shows the theme palette.
        </p>
        <div className="dashboard-theme-picker">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`dashboard-theme-card ${form.theme_active === theme.id ? "active" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, theme_active: theme.id }))}
            >
              <div className={`dashboard-theme-card-preview ${theme.previewClass}`} />
              <div className="dashboard-theme-card-info">
                <span className="dashboard-theme-card-name">{theme.name}</span>
                <span className="dashboard-theme-card-desc">{theme.description}</span>
              </div>
              {form.theme_active === theme.id && (
                <span className="dashboard-theme-card-check" aria-hidden>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {form.theme_active === "winter" && (
        <div className="dashboard-card dashboard-card-full" style={{ marginTop: 24 }}>
          <h3 className="dashboard-card-title">
            <SnowflakeIcon style={{ marginRight: 8, opacity: 0.6 }} />
            Winter Theme Options
          </h3>
          <div className="dashboard-theme-options">
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Snow animation</span>
                <span className="dashboard-theme-option-desc">Falling snowflakes across the entire site</span>
              </div>
              <Toggle
                on={form.theme_winter_snow_enabled === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_winter_snow_enabled: prev.theme_winter_snow_enabled === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle snow animation"
              />
            </div>
            {form.theme_winter_snow_enabled === "true" && (
              <div className="dashboard-theme-option">
                <div className="dashboard-theme-option-info">
                  <span className="dashboard-theme-option-label">Snow intensity</span>
                  <span className="dashboard-theme-option-desc">How much snow falls on screen</span>
                </div>
                <div className="dashboard-theme-slider-row">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.theme_winter_snow_intensity || "50"}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, theme_winter_snow_intensity: e.target.value }))
                    }
                    className="dashboard-theme-slider"
                  />
                  <span className="dashboard-theme-slider-value">
                    {form.theme_winter_snow_intensity || "50"}%
                  </span>
                </div>
              </div>
            )}
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Frost borders</span>
                <span className="dashboard-theme-option-desc">Icy glow borders on cards and panels</span>
              </div>
              <Toggle
                on={form.theme_winter_frost_borders === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_winter_frost_borders: prev.theme_winter_frost_borders === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle frost borders"
              />
            </div>
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Blue tint</span>
                <span className="dashboard-theme-option-desc">Cool ice-blue tint on backgrounds and surfaces</span>
              </div>
              <Toggle
                on={form.theme_winter_blue_tint === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_winter_blue_tint: prev.theme_winter_blue_tint === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle blue tint"
              />
            </div>
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Snowflake cursor</span>
                <span className="dashboard-theme-option-desc">Replace the default cursor with a snowflake icon</span>
              </div>
              <Toggle
                on={form.theme_winter_snowflake_cursor === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_winter_snowflake_cursor: prev.theme_winter_snowflake_cursor === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle snowflake cursor"
              />
            </div>
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Aurora background</span>
                <span className="dashboard-theme-option-desc">Slowly shifting blue/cyan aurora gradient behind content</span>
              </div>
              <Toggle
                on={form.theme_winter_aurora_bg === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_winter_aurora_bg: prev.theme_winter_aurora_bg === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle aurora background"
              />
            </div>
          </div>
        </div>
      )}

      {form.theme_active === "spring" && (
        <div className="dashboard-card dashboard-card-full" style={{ marginTop: 24 }}>
          <h3 className="dashboard-card-title">
            <LeafIcon style={{ marginRight: 8, opacity: 0.6 }} />
            Spring Theme Options
          </h3>
          <div className="dashboard-theme-options">
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Green tint</span>
                <span className="dashboard-theme-option-desc">Soft green tint on backgrounds and surfaces</span>
              </div>
              <Toggle
                on={form.theme_spring_green_tint === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_spring_green_tint: prev.theme_spring_green_tint === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle green tint"
              />
            </div>
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Blossom glow</span>
                <span className="dashboard-theme-option-desc">Subtle blossom/pink glow on cards and panels</span>
              </div>
              <Toggle
                on={form.theme_spring_blossom_glow === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_spring_blossom_glow: prev.theme_spring_blossom_glow === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle blossom glow"
              />
            </div>
            <div className="dashboard-theme-option">
              <div className="dashboard-theme-option-info">
                <span className="dashboard-theme-option-label">Leaf cursor</span>
                <span className="dashboard-theme-option-desc">Replace the default cursor with a leaf icon</span>
              </div>
              <Toggle
                on={form.theme_spring_leaf_cursor === "true"}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    theme_spring_leaf_cursor: prev.theme_spring_leaf_cursor === "true" ? "false" : "true",
                  }))
                }
                aria-label="Toggle leaf cursor"
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span style={{ fontSize: 14, color: "var(--success)" }}>Saved.</span>}
      </div>
    </div>
  );
}
