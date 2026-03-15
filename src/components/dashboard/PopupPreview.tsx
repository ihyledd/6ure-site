"use client";

type PopupData = Record<string, string>;

function g(p: PopupData, key: string, fallback: string) {
  return (p[key] != null && p[key] !== "" ? p[key] : fallback);
}

type PopupType = "discord" | "leaked" | "protected" | "preview" | "upsell" | "cancel";

export function PopupPreview({ type, data }: { type: PopupType; data: PopupData }) {
  if (type === "discord") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <h4>{g(data, "popup_discord_title_logged_in", "Join our Discord server")}</h4>
          <p>{g(data, "popup_discord_desc_logged_in", "You need to be a member of our Discord server to submit requests. Join once and you're all set.")}</p>
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_discord_btn_join", "Join Discord Server")}</span>
            <span className="popup-preview-btn">{g(data, "popup_discord_btn_ive_joined", "I've joined")}</span>
          </div>
          <div className="popup-preview-hint">{g(data, "popup_discord_hint", 'After joining, click "I\'ve joined" to continue.')}</div>
        </div>
      </div>
    );
  }
  if (type === "leaked") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <span className="popup-preview-badge">{g(data, "popup_leaked_badge", "Available")}</span>
          <p>{g(data, "popup_leaked_message", "This resource is already available on our Discord Server. Click the button below to check it out.")}</p>
          <div className="popup-preview-leak-card">
            <div className="popup-preview-leak-thumb"><span>Thumbnail</span></div>
            <div className="popup-preview-leak-info">
              <h4 className="popup-preview-leak-name">Leak / product name</h4>
              <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_leaked_btn_open", "Open in Discord")}</span>
            </div>
          </div>
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn">{g(data, "popup_leaked_btn_close", "Close")}</span>
          </div>
        </div>
      </div>
    );
  }
  if (type === "protected") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <h4>{g(data, "popup_protected_title", "Request Not Allowed")}</h4>
          <p>{g(data, "popup_protected_explanation", "Requests about this creator or content cannot be submitted. If you believe this is an error, please contact support.")}</p>
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_protected_btn", "Understood")}</span>
          </div>
        </div>
      </div>
    );
  }
  if (type === "preview") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <h4>{g(data, "popup_preview_title", "Review Your Request")}</h4>
          <p>{g(data, "popup_preview_title_hint", "You can edit the title if it's incorrect")}</p>
          <input type="text" className="popup-preview-input" readOnly placeholder={g(data, "popup_preview_title_placeholder", "Enter request title")} />
          <div className="popup-preview-image-section">
            <span className="popup-preview-image-label">Product Image</span>
            <div className="popup-preview-image-placeholder">
              <span>{g(data, "popup_preview_no_image", "No image found for this page (OG/twitter:image)")}</span>
            </div>
          </div>
          <div className="popup-preview-creator-row">
            <span className="popup-preview-avatar-placeholder" />
            <span className="popup-preview-creator-label">Creator: <strong>Creator Name</strong></span>
          </div>
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn">{g(data, "popup_preview_btn_cancel", "Cancel")}</span>
            <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_preview_btn_confirm", "Confirm & Submit")}</span>
          </div>
        </div>
      </div>
    );
  }
  if (type === "upsell") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <h4>{g(data, "popup_upsell_title", "Upgrade to Premium")}</h4>
          <p>{g(data, "popup_upsell_message", "Get priority requests and extra features!")}</p>
          <ul>
            <li>{g(data, "popup_upsell_bullet1", "Priority highlighting for your requests")}</li>
            <li>{g(data, "popup_upsell_bullet2", "Faster processing")}</li>
            <li>{g(data, "popup_upsell_bullet3", "Exclusive features")}</li>
          </ul>
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn">{g(data, "popup_upsell_btn_skip", "Maybe Later")}</span>
            <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_upsell_btn_upgrade", "Upgrade Now")}</span>
          </div>
        </div>
      </div>
    );
  }
  if (type === "cancel") {
    return (
      <div className="popup-preview-wrapper">
        <span className="popup-preview-label">Preview</span>
        <div className="popup-preview-mock">
          <h4>{g(data, "popup_cancel_title", "Request cancellation")}</h4>
          <p>{g(data, "popup_cancel_note", "Staff must approve your cancellation. A reason is required.")}</p>
          <input type="text" className="popup-preview-input" readOnly placeholder={g(data, "popup_cancel_placeholder", "Reason for cancellation...")} />
          <div className="popup-preview-buttons">
            <span className="popup-preview-btn">{g(data, "popup_cancel_btn_cancel", "Cancel")}</span>
            <span className="popup-preview-btn popup-preview-btn-primary">{g(data, "popup_cancel_btn_submit", "Submit cancellation request")}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
