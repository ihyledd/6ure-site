"use client";

import ReactMarkdown from "react-markdown";

type EmbedData = Record<string, string>;

function parseEmbedColor(hex: string): string {
  if (hex && typeof hex === "string" && /^0x[0-9A-Fa-f]+$/i.test(hex.trim())) {
    return "#" + hex.trim().slice(2);
  }
  return "#5865F2";
}

function g(data: EmbedData, key: string, fallback: string) {
  return (data[key] != null && data[key] !== "" ? data[key] : fallback);
}

type EmbedType =
  | "new_request"
  | "comment_reply"
  | "completed_dm"
  | "rejected_dm"
  | "leak_dm"
  | "deleted_dm"
  | "cancel_requested"
  | "cancel_approved"
  | "cancel_rejected"
  | "cancel_approved_dm"
  | "cancel_rejected_dm"
  | "cancel_deleted"
  | "staff_request";

const EMBED_CONFIG: Record<
  EmbedType,
  {
    prefix: string;
    defaultTitle: string;
    defaultDesc: string;
    defaultFooter: string;
    defaultColor: string;
    descReplace?: [string, string][];
    fields: { nameKey: string; defaultName: string; value: string; inline: boolean }[];
  }
> = {
  new_request: {
    prefix: "embed_new_request_",
    defaultTitle: "A new request has been created!",
    defaultDesc: "[View on Website]({requestUrl})",
    defaultFooter: "Request Monitor",
    defaultColor: "0x5865F2",
    descReplace: [["{requestUrl}", "https://example.com/requests/42"]],
    fields: [
      { nameKey: "embed_new_request_field_1_name", defaultName: "Product URL", value: "[View Product](https://example.com/product)", inline: true },
      { nameKey: "embed_new_request_field_2_name", defaultName: "Creator", value: "[Creator](https://example.com)", inline: true },
      { nameKey: "embed_new_request_field_3_name", defaultName: "Status", value: "pending", inline: true },
      { nameKey: "embed_new_request_field_4_name", defaultName: "Upvotes", value: "0", inline: true },
      { nameKey: "embed_new_request_field_views_name", defaultName: "Views", value: "0", inline: true },
      { nameKey: "embed_new_request_field_5_name", defaultName: "Request ID", value: "#42", inline: true },
      { nameKey: "embed_new_request_field_6_name", defaultName: "User", value: "Username", inline: true },
    ],
  },
  comment_reply: {
    prefix: "embed_comment_reply_",
    defaultTitle: "💬 Someone replied to your comment",
    defaultDesc: "You received a reply on the request **{requestTitle}**.",
    defaultFooter: "6ure Requests · Comment reply",
    defaultColor: "0x5865F2",
    descReplace: [["{requestTitle}", "My Request"]],
    fields: [
      { nameKey: "embed_comment_reply_field_1_name", defaultName: "Reply", value: "Sample reply text…", inline: false },
      { nameKey: "embed_comment_reply_field_2_name", defaultName: "From", value: "Username", inline: false },
      { nameKey: "embed_comment_reply_field_3_name", defaultName: "View comment", value: "[View on site](https://…)", inline: false },
    ],
  },
  completed_dm: {
    prefix: "embed_completed_dm_",
    defaultTitle: "Request Completed!",
    defaultDesc: "Your request has been marked as completed.",
    defaultFooter: "",
    defaultColor: "0x57F287",
    fields: [
      { nameKey: "embed_completed_dm_field_1_name", defaultName: "Request Details", value: "[View request](https://example.com)", inline: false },
      { nameKey: "embed_completed_dm_field_2_name", defaultName: "Request Author", value: "User", inline: false },
      { nameKey: "embed_completed_dm_field_3_name", defaultName: "Quick Links", value: "[Open in Discord](https://discord.com)", inline: false },
    ],
  },
  rejected_dm: {
    prefix: "embed_rejected_dm_",
    defaultTitle: "Request Rejected",
    defaultDesc: "Your request has been rejected.",
    defaultFooter: "",
    defaultColor: "0xED4245",
    fields: [
      { nameKey: "embed_rejected_dm_field_1_name", defaultName: "Request Details", value: "[View request](https://example.com)", inline: false },
      { nameKey: "embed_rejected_dm_field_2_name", defaultName: "Request Author", value: "User", inline: false },
      { nameKey: "embed_rejected_dm_field_3_name", defaultName: "Quick Links", value: "[Open in Discord](https://discord.com)", inline: false },
    ],
  },
  leak_dm: {
    prefix: "embed_leak_dm_",
    defaultTitle: "🎉 Request Leaked!",
    defaultDesc: "Your requested product has been leaked!",
    defaultFooter: "",
    defaultColor: "0x57F287",
    fields: [
      { nameKey: "embed_leak_dm_field_1_name", defaultName: "Request Details", value: "[View request](https://example.com)", inline: false },
      { nameKey: "embed_leak_dm_field_2_name", defaultName: "Request Author", value: "User", inline: false },
      { nameKey: "embed_leak_dm_field_3_name", defaultName: "Links", value: "[View leak](https://…)", inline: false },
    ],
  },
  deleted_dm: {
    prefix: "embed_deleted_dm_",
    defaultTitle: "Request Deleted",
    defaultDesc: "Your request was deleted by staff.",
    defaultFooter: "",
    defaultColor: "0xED4245",
    fields: [
      { nameKey: "embed_deleted_dm_field_1_name", defaultName: "Request title", value: "My Request", inline: false },
      { nameKey: "embed_deleted_dm_field_2_name", defaultName: "Reason", value: "Violation", inline: false },
      { nameKey: "embed_deleted_dm_field_3_name", defaultName: "Request ID", value: "#42", inline: false },
    ],
  },
  cancel_requested: {
    prefix: "embed_cancel_requested_",
    defaultTitle: "Cancellation requested",
    defaultDesc: "Requester requested cancellation for request **#{requestId}**.",
    defaultFooter: "Request #",
    defaultColor: "0xFEE75C",
    descReplace: [["{requestId}", "42"]],
    fields: [
      { nameKey: "embed_cancel_requested_field_1_name", defaultName: "Requester", value: "Username", inline: false },
      { nameKey: "embed_cancel_requested_field_2_name", defaultName: "Reason", value: "No longer needed", inline: false },
      { nameKey: "embed_cancel_requested_field_3_name", defaultName: "Request title", value: "My Request", inline: false },
      { nameKey: "embed_cancel_requested_field_4_name", defaultName: "Product URL", value: "[Link](https://…)", inline: false },
    ],
  },
  cancel_approved: {
    prefix: "embed_cancel_approved_",
    defaultTitle: "Cancellation approved",
    defaultDesc: "Request **#{requestId}** was cancelled by staff.",
    defaultFooter: "Request #",
    defaultColor: "0xED4245",
    descReplace: [["{requestId}", "42"]],
    fields: [
      { nameKey: "embed_cancel_approved_field_1_name", defaultName: "Requester", value: "Username", inline: false },
      { nameKey: "embed_cancel_approved_field_2_name", defaultName: "Approved by", value: "Staff", inline: false },
      { nameKey: "embed_cancel_approved_field_3_name", defaultName: "Reason", value: "No longer needed", inline: false },
      { nameKey: "embed_cancel_approved_field_4_name", defaultName: "Request title", value: "My Request", inline: false },
      { nameKey: "embed_cancel_approved_field_5_name", defaultName: "Product URL", value: "[Link](https://…)", inline: false },
    ],
  },
  cancel_rejected: {
    prefix: "embed_cancel_rejected_",
    defaultTitle: "Cancellation rejected",
    defaultDesc: "Cancellation request for **#{requestId}** was rejected by staff.",
    defaultFooter: "Request #",
    defaultColor: "0x57F287",
    descReplace: [["{requestId}", "42"]],
    fields: [
      { nameKey: "embed_cancel_rejected_field_1_name", defaultName: "Requester", value: "Username", inline: false },
      { nameKey: "embed_cancel_rejected_field_2_name", defaultName: "Rejected by", value: "Staff", inline: false },
      { nameKey: "embed_cancel_rejected_field_reason_name", defaultName: "Requester's reason", value: "No longer needed", inline: false },
      { nameKey: "embed_cancel_rejected_field_staff_reason_name", defaultName: "Staff's reason", value: "Request still valid", inline: false },
      { nameKey: "embed_cancel_rejected_field_3_name", defaultName: "Request title", value: "My Request", inline: false },
      { nameKey: "embed_cancel_rejected_field_4_name", defaultName: "Product URL", value: "[Link](https://…)", inline: false },
    ],
  },
  cancel_approved_dm: {
    prefix: "embed_cancel_approved_dm_",
    defaultTitle: "Cancellation approved",
    defaultDesc: "Your cancellation request was approved. The request has been removed.",
    defaultFooter: "Request #",
    defaultColor: "0x57F287",
    fields: [],
  },
  cancel_rejected_dm: {
    prefix: "embed_cancel_rejected_dm_",
    defaultTitle: "Cancellation rejected",
    defaultDesc: "Your cancellation request was rejected. You can request cancellation again after 24 hours.",
    defaultFooter: "Request #",
    defaultColor: "0xED4245",
    fields: [],
  },
  cancel_deleted: {
    prefix: "embed_cancel_deleted_",
    defaultTitle: "Request deleted by staff",
    defaultDesc: "**{title}** was permanently deleted.",
    defaultFooter: "Request #",
    defaultColor: "0xED4245",
    descReplace: [["{title}", "My Request"]],
    fields: [
      { nameKey: "embed_cancel_deleted_field_1_name", defaultName: "Deleted by", value: "Staff", inline: false },
      { nameKey: "embed_cancel_deleted_field_2_name", defaultName: "Requester", value: "Username", inline: false },
      { nameKey: "embed_cancel_deleted_field_3_name", defaultName: "Request title", value: "My Request", inline: false },
      { nameKey: "embed_cancel_deleted_field_4_name", defaultName: "Reason", value: "Violation", inline: false },
      { nameKey: "embed_cancel_deleted_field_5_name", defaultName: "Product URL", value: "[Link](https://…)", inline: false },
    ],
  },
  staff_request: {
    prefix: "embed_staff_request_",
    defaultTitle: "New request",
    defaultDesc: "",
    defaultFooter: "Request #",
    defaultColor: "0x5865F2",
    fields: [],
  },
};

export function EmbedPreview({ type, data }: { type: EmbedType; data: EmbedData }) {
  const cfg = EMBED_CONFIG[type];
  if (!cfg) return null;

  const { prefix, defaultTitle, defaultDesc, defaultFooter, defaultColor, descReplace, fields } = cfg;
  const colorKey = prefix + "color";
  const titleKey = prefix + "title";
  const descKey = prefix + "description";
  const footerKey = prefix + "footer";

  const cssColor = parseEmbedColor(g(data, colorKey, defaultColor));
  let description = g(data, descKey, defaultDesc);
  if (descReplace) {
    for (const [from, to] of descReplace) {
      description = description.replace(from, to);
    }
  }

  const resolvedFields = fields.map((f) => ({
    name: g(data, f.nameKey, f.defaultName),
    value: f.value,
    inline: f.inline,
  }));

  const inlineFields = resolvedFields.filter((f) => f.inline);
  const blockFields = resolvedFields.filter((f) => !f.inline);

  return (
    <div className="embed-preview-wrapper">
      <span className="embed-preview-label">Preview</span>
      <div className="embed-preview" style={{ borderLeftColor: cssColor }}>
        <div className="embed-preview-title-desc">
          <div className="embed-preview-title">{g(data, titleKey, defaultTitle)}</div>
        </div>
        {description && (
          <div className="embed-preview-desc embed-preview-markdown">
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        )}
        {inlineFields.length > 0 && (
          <div className="embed-preview-fields embed-preview-fields-inline">
            {inlineFields.map((f, i) => (
              <div key={i} className="embed-preview-field">
                <span className="embed-preview-field-name">{f.name}</span>
                <span className="embed-preview-field-value embed-preview-markdown">
                  <ReactMarkdown>{String(f.value)}</ReactMarkdown>
                </span>
              </div>
            ))}
          </div>
        )}
        {blockFields.length > 0 && (
          <div className="embed-preview-fields embed-preview-fields-block">
            {blockFields.map((f, i) => (
              <div key={i} className="embed-preview-field embed-preview-field-block">
                <span className="embed-preview-field-name">{f.name}</span>
                <span className="embed-preview-field-value embed-preview-markdown">
                  <ReactMarkdown>{String(f.value)}</ReactMarkdown>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="embed-preview-footer">
          <span className="embed-preview-footer-left">
            <span className="embed-preview-footer-icon-placeholder" />
            <span className="embed-preview-footer-text">{g(data, footerKey, defaultFooter) || " "}</span>
          </span>
          <span className="embed-preview-time">{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}

export const EMBED_TYPES: { type: EmbedType; label: string }[] = [
  { type: "new_request", label: "New Request (Discord channel)" },
  { type: "comment_reply", label: "Comment Reply DM" },
  { type: "completed_dm", label: "Completed DM" },
  { type: "rejected_dm", label: "Rejected DM" },
  { type: "leak_dm", label: "Leak DM" },
  { type: "deleted_dm", label: "Deleted DM" },
  { type: "cancel_requested", label: "Cancel Requested (staff)" },
  { type: "cancel_approved", label: "Cancel Approved (staff)" },
  { type: "cancel_rejected", label: "Cancel Rejected (staff)" },
  { type: "cancel_approved_dm", label: "Cancel Approved DM" },
  { type: "cancel_rejected_dm", label: "Cancel Rejected DM" },
  { type: "cancel_deleted", label: "Cancel Deleted" },
  { type: "staff_request", label: "Staff Request" },
];
