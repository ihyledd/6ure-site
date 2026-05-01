"use client";

type UserSettingsForm = Record<string, string>;

export function UserSettingsFormEditor({
  form,
  update,
  saving,
  onSave,
}: {
  form: UserSettingsForm;
  update: (key: string, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const toggle = (key: string) => {
    const current = form[key] === "true";
    update(key, current ? "false" : "true");
  };

  return (
    <>
      <div className="dashboard-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Default user settings</h2>
        <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <p className="dashboard-card-desc" style={{ marginBottom: 24 }}>
        Default values for new users who haven&apos;t set preferences yet.
      </p>

      <div className="dashboard-cards" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Theme &amp; appearance</h3>
          <div className="dashboard-form-group">
            <label>Theme</label>
            <select value={form.theme ?? "dark"} onChange={(e) => update("theme", e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Requests</h3>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Submit anonymously by default</span>
              <span className="dashboard-toggle-desc">New users will have anonymous mode enabled</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.anonymous ?? "false") === "true" ? "active" : ""}`}
              onClick={() => toggle("anonymous")}
              aria-pressed={(form.anonymous ?? "false") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Notifications</h3>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Site notifications</span>
              <span className="dashboard-toggle-desc">Browser push notifications for requests</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.push ?? "true") === "true" ? "active" : ""}`}
              onClick={() => toggle("push")}
              aria-pressed={(form.push ?? "true") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Discord DMs (requests &amp; leaks)</span>
              <span className="dashboard-toggle-desc">Receive DMs when requests are completed or leaked</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.discordDm ?? "true") === "true" ? "active" : ""}`}
              onClick={() => toggle("discordDm")}
              aria-pressed={(form.discordDm ?? "true") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Discord DMs (comment replies)</span>
              <span className="dashboard-toggle-desc">Receive DMs when someone replies to your comment</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.discordDmCommentReplies ?? "true") === "true" ? "active" : ""}`}
              onClick={() => toggle("discordDmCommentReplies")}
              aria-pressed={(form.discordDmCommentReplies ?? "true") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Region</h3>
          <div className="dashboard-form-group">
            <label>Timezone</label>
            <select value={form.timezone ?? "auto"} onChange={(e) => update("timezone", e.target.value)}>
              <option value="auto">Auto (browser)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="America/New_York">America/New York</option>
            </select>
          </div>
          <div className="dashboard-form-group">
            <label>Date format</label>
            <select value={form.dateFormat ?? "relative"} onChange={(e) => update("dateFormat", e.target.value)}>
              <option value="relative">Relative (e.g. 2h ago)</option>
              <option value="short">Short (DD/MM/YYYY)</option>
              <option value="medium">Medium (e.g. Jan 15, 2025)</option>
              <option value="long">Long (e.g. Monday, January 15, 2025)</option>
            </select>
          </div>
        </section>
      </div>
    </>
  );
}
