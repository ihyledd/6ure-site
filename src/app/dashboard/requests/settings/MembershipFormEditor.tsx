"use client";

function parseFeaturesToLines(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return "";
    return arr.filter((x): x is string => typeof x === "string").join("\n");
  } catch {
    return raw;
  }
}

function linesToFeaturesJson(lines: string): string {
  const arr = lines
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
}

export function MembershipFormEditor({
  form,
  update,
  saving,
  onSave,
}: {
  form: Record<string, string>;
  update: (key: string, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const toggle = (key: string) => {
    const current = form[key] === "true";
    update(key, current ? "false" : "true");
  };

  const premiumFeaturesLines = parseFeaturesToLines(form.premium_features);
  const protectionFeaturesLines = parseFeaturesToLines(form.protection_features);

  return (
    <>
      <div
        className="dashboard-section-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Membership page</h2>
        <button
          type="button"
          className="dashboard-btn dashboard-btn-primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <p className="dashboard-card-desc" style={{ marginBottom: 24 }}>
        Hero, plan cards (Basic, Premium, Leak Protection), and footer. Markdown supported in subtitle and notes.
      </p>

      <div className="dashboard-cards" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Hero</h3>
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.hero_title ?? ""}
              onChange={(e) => update("hero_title", e.target.value)}
              placeholder="Choose your membership"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Subtitle (markdown supported)</label>
            <textarea
              rows={3}
              value={form.hero_subtitle ?? ""}
              onChange={(e) => update("hero_subtitle", e.target.value)}
              placeholder="Short description…"
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Basic card</h3>
          <div className="dashboard-form-group">
            <label>Card title</label>
            <input
              type="text"
              value={form.basic_card_title ?? ""}
              onChange={(e) => update("basic_card_title", e.target.value)}
              placeholder="Basic"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button label</label>
            <input
              type="text"
              value={form.basic_cta_text ?? ""}
              onChange={(e) => update("basic_cta_text", e.target.value)}
              placeholder="Get started"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button link (when user clicks Basic card CTA)</label>
            <input
              type="url"
              value={form.basic_join_url ?? ""}
              onChange={(e) => update("basic_join_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Premium card</h3>
          <div className="dashboard-form-group">
            <label>Card title</label>
            <input
              type="text"
              value={form.premium_card_title ?? ""}
              onChange={(e) => update("premium_card_title", e.target.value)}
              placeholder="Premium"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Card label (subtitle)</label>
            <input
              type="text"
              value={form.premium_card_label ?? ""}
              onChange={(e) => update("premium_card_label", e.target.value)}
              placeholder="Access to leaks"
            />
          </div>
          <div className="dashboard-form-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="dashboard-form-group">
              <label>Monthly price ($)</label>
              <input
                type="text"
                value={form.premium_monthly ?? ""}
                onChange={(e) => update("premium_monthly", e.target.value)}
                placeholder="2.40"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Yearly price ($)</label>
              <input
                type="text"
                value={form.premium_yearly ?? ""}
                onChange={(e) => update("premium_yearly", e.target.value)}
                placeholder="28.80"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Save label (e.g. &quot;Save 20%&quot;)</label>
              <input
                type="text"
                value={form.premium_save_label ?? ""}
                onChange={(e) => update("premium_save_label", e.target.value)}
                placeholder="Save 20%"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Old price – monthly (original before discount, shown greyed out)</label>
              <input
                type="text"
                value={form.premium_old_price_monthly ?? ""}
                onChange={(e) => update("premium_old_price_monthly", e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Old price – annual (original before discount, shown greyed out)</label>
              <input
                type="text"
                value={form.premium_old_price_yearly ?? ""}
                onChange={(e) => update("premium_old_price_yearly", e.target.value)}
                placeholder="36"
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Badge text (optional)</label>
            <input
              type="text"
              value={form.premium_badge_text ?? ""}
              onChange={(e) => update("premium_badge_text", e.target.value)}
              placeholder="Most popular"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button label</label>
            <input
              type="text"
              value={form.premium_cta_text ?? ""}
              onChange={(e) => update("premium_cta_text", e.target.value)}
              placeholder="Join Premium"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button link (when user selects Premium)</label>
            <input
              type="url"
              value={form.premium_join_url ?? ""}
              onChange={(e) => update("premium_join_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Features (one per line; markdown supported per line)</label>
            <textarea
              rows={6}
              value={premiumFeaturesLines}
              onChange={(e) => update("premium_features", linesToFeaturesJson(e.target.value))}
              placeholder={"Instant Access to Leaks\nExtra 2x entry to Giveaways"}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Note (markdown supported)</label>
            <textarea
              rows={2}
              value={form.premium_note ?? ""}
              onChange={(e) => update("premium_note", e.target.value)}
              placeholder="To access all perks…"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Warning (markdown supported)</label>
            <textarea
              rows={2}
              value={form.premium_warning ?? ""}
              onChange={(e) => update("premium_warning", e.target.value)}
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Leak Protection card</h3>
          <div className="dashboard-form-group">
            <label>Card title</label>
            <input
              type="text"
              value={form.protection_card_title ?? ""}
              onChange={(e) => update("protection_card_title", e.target.value)}
              placeholder="Leak Protection"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Card label (subtitle)</label>
            <input
              type="text"
              value={form.protection_card_label ?? ""}
              onChange={(e) => update("protection_card_label", e.target.value)}
              placeholder="Your stuff at all cost"
            />
          </div>
          <div className="dashboard-form-row" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="dashboard-form-group">
              <label>Monthly price ($)</label>
              <input
                type="text"
                value={form.protection_monthly ?? ""}
                onChange={(e) => update("protection_monthly", e.target.value)}
                placeholder="6"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Yearly price ($)</label>
              <input
                type="text"
                value={form.protection_yearly ?? ""}
                onChange={(e) => update("protection_yearly", e.target.value)}
                placeholder="55"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Save label</label>
              <input
                type="text"
                value={form.protection_save_label ?? ""}
                onChange={(e) => update("protection_save_label", e.target.value)}
                placeholder="$17 off"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Old price – monthly (original before discount, shown greyed out)</label>
              <input
                type="text"
                value={form.protection_old_price_monthly ?? ""}
                onChange={(e) => update("protection_old_price_monthly", e.target.value)}
                placeholder="7"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Old price – annual (original before discount, shown greyed out)</label>
              <input
                type="text"
                value={form.protection_old_price_yearly ?? ""}
                onChange={(e) => update("protection_old_price_yearly", e.target.value)}
                placeholder="72"
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Badge text (optional)</label>
            <input
              type="text"
              value={form.protection_badge_text ?? ""}
              onChange={(e) => update("protection_badge_text", e.target.value)}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button label</label>
            <input
              type="text"
              value={form.protection_cta_text ?? ""}
              onChange={(e) => update("protection_cta_text", e.target.value)}
              placeholder="Join Leak Protection"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Button link (when user selects Leak Protection)</label>
            <input
              type="url"
              value={form.protection_join_url ?? ""}
              onChange={(e) => update("protection_join_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Features (one per line; markdown supported)</label>
            <textarea
              rows={5}
              value={protectionFeaturesLines}
              onChange={(e) => update("protection_features", linesToFeaturesJson(e.target.value))}
              placeholder={"Complete Leak Removal\nContent Request Block"}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Note (markdown supported)</label>
            <textarea
              rows={2}
              value={form.protection_note ?? ""}
              onChange={(e) => update("protection_note", e.target.value)}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Warning (markdown supported)</label>
            <textarea
              rows={2}
              value={form.protection_warning ?? ""}
              onChange={(e) => update("protection_warning", e.target.value)}
              placeholder="Must open a ticket…"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Legal note (markdown supported)</label>
            <textarea
              rows={2}
              value={form.protection_legal_note ?? ""}
              onChange={(e) => update("protection_legal_note", e.target.value)}
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Footer</h3>
          <div className="dashboard-form-group">
            <label>Security message</label>
            <input
              type="text"
              value={form.footer_security_line ?? ""}
              onChange={(e) => update("footer_security_line", e.target.value)}
              placeholder="100% secure payment method…"
            />
          </div>
          <div className="dashboard-form-group">
            <label>&quot;Upgrade Now&quot; button label</label>
            <input
              type="text"
              value={form.footer_cta_text ?? ""}
              onChange={(e) => update("footer_cta_text", e.target.value)}
              placeholder="Upgrade Now"
            />
          </div>
          <div className="dashboard-form-group">
            <label>&quot;Upgrade Now&quot; button link</label>
            <input
              type="url"
              value={form.footer_cta_url ?? ""}
              onChange={(e) => update("footer_cta_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </section>

        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Toggles</h3>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Monthly / Annual billing toggle</span>
              <span className="dashboard-toggle-desc">Show toggle so users can switch between monthly and annual prices</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.discount_active ?? "true") === "true" ? "active" : ""}`}
              onClick={() => toggle("discount_active")}
              aria-pressed={(form.discount_active ?? "true") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
          <div className="dashboard-toggle-row">
            <div className="dashboard-toggle-label">
              <span className="dashboard-toggle-name">Show FAQ section</span>
              <span className="dashboard-toggle-desc">Show membership FAQ below the plan cards</span>
            </div>
            <button
              type="button"
              className={`dashboard-toggle ${(form.show_faq ?? "true") === "true" ? "active" : ""}`}
              onClick={() => toggle("show_faq")}
              aria-pressed={(form.show_faq ?? "true") === "true"}
            >
              <span className="dashboard-toggle-thumb" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
