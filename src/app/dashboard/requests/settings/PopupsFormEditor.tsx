"use client";

import { PopupPreview } from "@/components/dashboard/PopupPreview";

type PopupForm = Record<string, string>;

export function PopupsFormEditor({
  form,
  update,
  saving,
  onSave,
}: {
  form: PopupForm;
  update: (key: string, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div className="dashboard-section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Popups & modals</h2>
        <button type="button" className="dashboard-btn dashboard-btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="dashboard-cards" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Discord */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Join Discord popup</h3>
          <p className="dashboard-card-desc">Shown when a user must join the Discord server to submit requests.</p>
          <PopupPreview type="discord" data={form} />
          <div className="dashboard-form-group">
            <label>Title (when logged in)</label>
            <input type="text" value={form.popup_discord_title_logged_in ?? ""} onChange={(e) => update("popup_discord_title_logged_in", e.target.value)} placeholder="Join our Discord server" />
          </div>
          <div className="dashboard-form-group">
            <label>Title (when not logged in)</label>
            <input type="text" value={form.popup_discord_title_not_logged_in ?? ""} onChange={(e) => update("popup_discord_title_not_logged_in", e.target.value)} placeholder="Log in & join our Discord" />
          </div>
          <div className="dashboard-form-group">
            <label>Description (when logged in)</label>
            <textarea value={form.popup_discord_desc_logged_in ?? ""} onChange={(e) => update("popup_discord_desc_logged_in", e.target.value)} rows={2} placeholder="You need to be a member…" />
          </div>
          <div className="dashboard-form-group">
            <label>Description (when not logged in)</label>
            <textarea value={form.popup_discord_desc_not_logged_in ?? ""} onChange={(e) => update("popup_discord_desc_not_logged_in", e.target.value)} rows={2} placeholder="Log in with Discord…" />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Login button text</label>
              <input type="text" value={form.popup_discord_btn_login ?? ""} onChange={(e) => update("popup_discord_btn_login", e.target.value)} placeholder="Login with Discord" />
            </div>
            <div className="dashboard-form-group">
              <label>Join button text</label>
              <input type="text" value={form.popup_discord_btn_join ?? ""} onChange={(e) => update("popup_discord_btn_join", e.target.value)} placeholder="Join Discord Server" />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>&quot;I&apos;ve joined&quot; button text</label>
              <input type="text" value={form.popup_discord_btn_ive_joined ?? ""} onChange={(e) => update("popup_discord_btn_ive_joined", e.target.value)} placeholder="I've joined" />
            </div>
            <div className="dashboard-form-group">
              <label>Not you? button text</label>
              <input type="text" value={form.popup_discord_btn_not_you ?? ""} onChange={(e) => update("popup_discord_btn_not_you", e.target.value)} placeholder="Not you? Log in again" />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Hint below buttons</label>
            <input type="text" value={form.popup_discord_hint ?? ""} onChange={(e) => update("popup_discord_hint", e.target.value)} placeholder="After joining, click…" />
          </div>
          <div className="dashboard-form-group">
            <label>Discord invite URL</label>
            <input type="text" value={form.popup_discord_invite_url ?? ""} onChange={(e) => update("popup_discord_invite_url", e.target.value)} placeholder="https://discord.gg/…" />
          </div>
        </section>

        {/* Leaked */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Already leaked modal</h3>
          <p className="dashboard-card-desc">Shown when the requested resource is already available on Discord.</p>
          <PopupPreview type="leaked" data={form} />
          <div className="dashboard-form-group">
            <label>Badge text (e.g. Available)</label>
            <input type="text" value={form.popup_leaked_badge ?? ""} onChange={(e) => update("popup_leaked_badge", e.target.value)} placeholder="Available" />
          </div>
          <div className="dashboard-form-group">
            <label>Message</label>
            <textarea value={form.popup_leaked_message ?? ""} onChange={(e) => update("popup_leaked_message", e.target.value)} rows={2} placeholder="This resource is already available…" />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Open-in-Discord button text</label>
              <input type="text" value={form.popup_leaked_btn_open ?? ""} onChange={(e) => update("popup_leaked_btn_open", e.target.value)} placeholder="Open in Discord" />
            </div>
            <div className="dashboard-form-group">
              <label>Close button text</label>
              <input type="text" value={form.popup_leaked_btn_close ?? ""} onChange={(e) => update("popup_leaked_btn_close", e.target.value)} placeholder="Close" />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Fallback when no link</label>
            <input type="text" value={form.popup_leaked_no_link ?? ""} onChange={(e) => update("popup_leaked_no_link", e.target.value)} placeholder="Leak link not available." />
          </div>
        </section>

        {/* Protected */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Protected content modal</h3>
          <p className="dashboard-card-desc">Shown when a request is blocked (protected creator/content).</p>
          <PopupPreview type="protected" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input type="text" value={form.popup_protected_title ?? ""} onChange={(e) => update("popup_protected_title", e.target.value)} placeholder="Request Not Allowed" />
          </div>
          <div className="dashboard-form-group">
            <label>Explanation (below dynamic message)</label>
            <textarea value={form.popup_protected_explanation ?? ""} onChange={(e) => update("popup_protected_explanation", e.target.value)} rows={2} placeholder="Requests about this creator…" />
          </div>
          <div className="dashboard-form-group">
            <label>Button text</label>
            <input type="text" value={form.popup_protected_btn ?? ""} onChange={(e) => update("popup_protected_btn", e.target.value)} placeholder="Understood" />
          </div>
        </section>

        {/* Preview */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Request preview modal</h3>
          <p className="dashboard-card-desc">Shown before user confirms and submits a new request.</p>
          <PopupPreview type="preview" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input type="text" value={form.popup_preview_title ?? ""} onChange={(e) => update("popup_preview_title", e.target.value)} placeholder="Review Your Request" />
          </div>
          <div className="dashboard-form-group">
            <label>Title hint</label>
            <input type="text" value={form.popup_preview_title_hint ?? ""} onChange={(e) => update("popup_preview_title_hint", e.target.value)} placeholder="You can edit the title…" />
          </div>
          <div className="dashboard-form-group">
            <label>Anonymous badge text</label>
            <input type="text" value={form.popup_preview_anonymous ?? ""} onChange={(e) => update("popup_preview_anonymous", e.target.value)} placeholder="🔒 This request…" />
          </div>
          <div className="dashboard-form-group">
            <label>Login required message</label>
            <input type="text" value={form.popup_preview_login_required ?? ""} onChange={(e) => update("popup_preview_login_required", e.target.value)} placeholder="Log in to submit…" />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title placeholder</label>
              <input type="text" value={form.popup_preview_title_placeholder ?? ""} onChange={(e) => update("popup_preview_title_placeholder", e.target.value)} />
            </div>
            <div className="dashboard-form-group">
              <label>No image placeholder</label>
              <input type="text" value={form.popup_preview_no_image ?? ""} onChange={(e) => update("popup_preview_no_image", e.target.value)} />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Cancel button</label>
              <input type="text" value={form.popup_preview_btn_cancel ?? ""} onChange={(e) => update("popup_preview_btn_cancel", e.target.value)} placeholder="Cancel" />
            </div>
            <div className="dashboard-form-group">
              <label>Confirm button</label>
              <input type="text" value={form.popup_preview_btn_confirm ?? ""} onChange={(e) => update("popup_preview_btn_confirm", e.target.value)} placeholder="Confirm & Submit" />
            </div>
            <div className="dashboard-form-group">
              <label>Creating… text</label>
              <input type="text" value={form.popup_preview_creating ?? ""} onChange={(e) => update("popup_preview_creating", e.target.value)} placeholder="Creating..." />
            </div>
          </div>
        </section>

        {/* Upsell */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Premium upsell modal</h3>
          <p className="dashboard-card-desc">Shown randomly to non‑premium users before request preview.</p>
          <PopupPreview type="upsell" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input type="text" value={form.popup_upsell_title ?? ""} onChange={(e) => update("popup_upsell_title", e.target.value)} placeholder="⭐ Upgrade to Premium" />
          </div>
          <div className="dashboard-form-group">
            <label>Message</label>
            <input type="text" value={form.popup_upsell_message ?? ""} onChange={(e) => update("popup_upsell_message", e.target.value)} placeholder="Get priority requests…" />
          </div>
          <div className="dashboard-form-group">
            <label>Bullet 1</label>
            <input type="text" value={form.popup_upsell_bullet1 ?? ""} onChange={(e) => update("popup_upsell_bullet1", e.target.value)} />
          </div>
          <div className="dashboard-form-group">
            <label>Bullet 2</label>
            <input type="text" value={form.popup_upsell_bullet2 ?? ""} onChange={(e) => update("popup_upsell_bullet2", e.target.value)} />
          </div>
          <div className="dashboard-form-group">
            <label>Bullet 3</label>
            <input type="text" value={form.popup_upsell_bullet3 ?? ""} onChange={(e) => update("popup_upsell_bullet3", e.target.value)} />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Skip button</label>
              <input type="text" value={form.popup_upsell_btn_skip ?? ""} onChange={(e) => update("popup_upsell_btn_skip", e.target.value)} placeholder="Maybe Later" />
            </div>
            <div className="dashboard-form-group">
              <label>Upgrade button</label>
              <input type="text" value={form.popup_upsell_btn_upgrade ?? ""} onChange={(e) => update("popup_upsell_btn_upgrade", e.target.value)} placeholder="Upgrade Now" />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Upgrade URL</label>
            <input type="text" value={form.popup_upsell_url ?? ""} onChange={(e) => update("popup_upsell_url", e.target.value)} placeholder="https://…" />
          </div>
        </section>

        {/* Cancel */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Cancel request modal</h3>
          <p className="dashboard-card-desc">Shown when user requests cancellation of their request (Request detail page).</p>
          <PopupPreview type="cancel" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input type="text" value={form.popup_cancel_title ?? ""} onChange={(e) => update("popup_cancel_title", e.target.value)} placeholder="Request cancellation" />
          </div>
          <div className="dashboard-form-group">
            <label>Note</label>
            <textarea value={form.popup_cancel_note ?? ""} onChange={(e) => update("popup_cancel_note", e.target.value)} rows={2} placeholder="Staff must approve…" />
          </div>
          <div className="dashboard-form-group">
            <label>Reason placeholder</label>
            <input type="text" value={form.popup_cancel_placeholder ?? ""} onChange={(e) => update("popup_cancel_placeholder", e.target.value)} placeholder="Reason for cancellation..." />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Cancel button</label>
              <input type="text" value={form.popup_cancel_btn_cancel ?? ""} onChange={(e) => update("popup_cancel_btn_cancel", e.target.value)} placeholder="Cancel" />
            </div>
            <div className="dashboard-form-group">
              <label>Submit button</label>
              <input type="text" value={form.popup_cancel_btn_submit ?? ""} onChange={(e) => update("popup_cancel_btn_submit", e.target.value)} placeholder="Submit cancellation request" />
            </div>
            <div className="dashboard-form-group">
              <label>Submitting… text</label>
              <input type="text" value={form.popup_cancel_submitting ?? ""} onChange={(e) => update("popup_cancel_submitting", e.target.value)} placeholder="Submitting..." />
            </div>
          </div>
        </section>

        {/* Error messages */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Error messages</h3>
          <p className="dashboard-card-desc">Shown when the API or scraper service is unavailable.</p>
          <PopupPreview type="error" data={form} />
          <div className="dashboard-form-group">
            <label>API offline (requests page)</label>
            <textarea value={form.popup_error_api_offline ?? ""} onChange={(e) => update("popup_error_api_offline", e.target.value)} rows={2} placeholder="The requests service is currently unavailable…" />
          </div>
          <div className="dashboard-form-group">
            <label>Scraper down (request form preview)</label>
            <textarea value={form.popup_error_scraper_down ?? ""} onChange={(e) => update("popup_error_scraper_down", e.target.value)} rows={2} placeholder="The preview service is currently unavailable…" />
          </div>
          <div className="dashboard-form-group">
            <label>Network error (request form)</label>
            <textarea value={form.popup_error_network ?? ""} onChange={(e) => update("popup_error_network", e.target.value)} rows={2} placeholder="Could not reach the preview service…" />
          </div>
        </section>
      </div>
    </>
  );
}
