"use client";

import { EmbedPreview } from "@/components/dashboard/EmbedPreview";

type EmbedForm = Record<string, string>;

export function EmbedsFormEditor({
  form,
  update,
  saving,
  onSave,
  onRefreshEmbeds,
  refreshStatus,
}: {
  form: EmbedForm;
  update: (key: string, value: string) => void;
  saving: boolean;
  onSave: () => void;
  onRefreshEmbeds: () => void;
  refreshStatus: string | null;
}) {
  const checkbox = (key: string, label: string, defaultChecked = false) => (
    <label className="dashboard-form-group dashboard-form-check">
      <input
        type="checkbox"
        className="dashboard-toggle-input"
        checked={(form[key] ?? (defaultChecked ? "true" : "false")) === "true"}
        onChange={(e) => update(key, e.target.checked ? "true" : "false")}
      />
      <span className="dashboard-toggle-track" />
      <span className="dashboard-toggle-label">{label}</span>
    </label>
  );

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
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          Discord embeds
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="dashboard-btn"
            onClick={onRefreshEmbeds}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Refresh all embeds
          </button>
        </div>
      </div>
      {refreshStatus && (
        <p style={{ marginBottom: 24, fontSize: 14 }}>{refreshStatus}</p>
      )}
      <p className="dashboard-card-desc" style={{ marginBottom: 24 }}>
        Customize all Discord embed options (title, description, color,
        footer, author, image/thumbnail, field labels). Colors use 0x prefix
        (e.g. 0x5865F2).
      </p>

      <div
        className="dashboard-cards"
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {/* New request (staff channel) */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">New request (staff channel)</h3>
          <p className="dashboard-card-desc">
            Embed posted in the staff channel when a new request is created.
          </p>
          <EmbedPreview type="new_request" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_new_request_title ?? ""}
              onChange={(e) => update("embed_new_request_title", e.target.value)}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description (use {"{requestUrl}"} for link)</label>
            <input
              type="text"
              value={form.embed_new_request_description ?? ""}
              onChange={(e) =>
                update("embed_new_request_description", e.target.value)
              }
              placeholder="[View on Website](url)"
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color (0x…)</label>
              <input
                type="text"
                value={form.embed_new_request_color ?? ""}
                onChange={(e) =>
                  update("embed_new_request_color", e.target.value)
                }
                placeholder="0x5865F2"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_new_request_footer ?? ""}
                onChange={(e) =>
                  update("embed_new_request_footer", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer icon URL</label>
              <input
                type="text"
                value={form.embed_new_request_footer_icon ?? ""}
                onChange={(e) =>
                  update("embed_new_request_footer_icon", e.target.value)
                }
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Author name</label>
              <input
                type="text"
                value={form.embed_new_request_author_name ?? ""}
                onChange={(e) =>
                  update("embed_new_request_author_name", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Author icon URL</label>
              <input
                type="text"
                value={form.embed_new_request_author_icon ?? ""}
                onChange={(e) =>
                  update("embed_new_request_author_icon", e.target.value)
                }
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            {checkbox(
              "embed_new_request_image_enabled",
              "Show main image",
              true
            )}
            {checkbox(
              "embed_new_request_thumbnail_enabled",
              "Show thumbnail",
              false
            )}
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_new_request_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(`embed_new_request_field_${i}_name`, e.target.value)
                  }
                />
              </div>
            ))}
            <div className="dashboard-form-group" style={{ minWidth: 140 }}>
              <label>Views field name</label>
              <input
                type="text"
                value={form.embed_new_request_field_views_name ?? ""}
                onChange={(e) =>
                  update("embed_new_request_field_views_name", e.target.value)
                }
                placeholder="Views"
              />
            </div>
          </div>
        </section>

        {/* Comment reply */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Comment reply</h3>
          <p className="dashboard-card-desc">
            DM sent when someone replies to a user&apos;s comment.
          </p>
          <EmbedPreview type="comment_reply" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_comment_reply_title ?? ""}
              onChange={(e) =>
                update("embed_comment_reply_title", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description (use {"{requestTitle}"} for request name)</label>
            <input
              type="text"
              value={form.embed_comment_reply_description ?? ""}
              onChange={(e) =>
                update("embed_comment_reply_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_comment_reply_color ?? ""}
                onChange={(e) =>
                  update("embed_comment_reply_color", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_comment_reply_footer ?? ""}
                onChange={(e) =>
                  update("embed_comment_reply_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_comment_reply_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_comment_reply_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Completed DM */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Completed DM</h3>
          <p className="dashboard-card-desc">
            DM sent when a request is marked as completed.
          </p>
          <EmbedPreview type="completed_dm" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_completed_dm_title ?? ""}
              onChange={(e) =>
                update("embed_completed_dm_title", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_completed_dm_description ?? ""}
              onChange={(e) =>
                update("embed_completed_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_completed_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_completed_dm_color", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_completed_dm_footer ?? ""}
                onChange={(e) =>
                  update("embed_completed_dm_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Author</label>
              <input
                type="text"
                value={form.embed_completed_dm_author_name ?? ""}
                onChange={(e) =>
                  update("embed_completed_dm_author_name", e.target.value)
                }
              />
            </div>
            {checkbox(
              "embed_completed_dm_thumbnail_enabled",
              "Show thumbnail",
              true
            )}
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_completed_dm_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_completed_dm_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Rejected DM */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Rejected DM</h3>
          <p className="dashboard-card-desc">
            DM sent when a request is rejected.
          </p>
          <EmbedPreview type="rejected_dm" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_rejected_dm_title ?? ""}
              onChange={(e) =>
                update("embed_rejected_dm_title", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_rejected_dm_description ?? ""}
              onChange={(e) =>
                update("embed_rejected_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_rejected_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_rejected_dm_color", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_rejected_dm_footer ?? ""}
                onChange={(e) =>
                  update("embed_rejected_dm_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Author</label>
              <input
                type="text"
                value={form.embed_rejected_dm_author_name ?? ""}
                onChange={(e) =>
                  update("embed_rejected_dm_author_name", e.target.value)
                }
              />
            </div>
            {checkbox(
              "embed_rejected_dm_thumbnail_enabled",
              "Show thumbnail",
              true
            )}
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_rejected_dm_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_rejected_dm_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Leak DM */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Leak DM</h3>
          <p className="dashboard-card-desc">
            DM sent when the requested product has been leaked.
          </p>
          <EmbedPreview type="leak_dm" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_leak_dm_title ?? ""}
              onChange={(e) =>
                update("embed_leak_dm_title", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_leak_dm_description ?? ""}
              onChange={(e) =>
                update("embed_leak_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_leak_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_leak_dm_color", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_leak_dm_footer ?? ""}
                onChange={(e) =>
                  update("embed_leak_dm_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Author</label>
              <input
                type="text"
                value={form.embed_leak_dm_author_name ?? ""}
                onChange={(e) =>
                  update("embed_leak_dm_author_name", e.target.value)
                }
              />
            </div>
            {checkbox(
              "embed_leak_dm_thumbnail_enabled",
              "Show thumbnail",
              true
            )}
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_leak_dm_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_leak_dm_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Deleted DM */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Deleted DM</h3>
          <p className="dashboard-card-desc">
            DM sent when staff deletes a request and notifies the requester.
            Placeholders: {"{title}"} = request title, {"{reason}"} = reason.
          </p>
          <EmbedPreview type="deleted_dm" data={form} />
          <div className="dashboard-form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.embed_deleted_dm_title ?? ""}
              onChange={(e) =>
                update("embed_deleted_dm_title", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_deleted_dm_description ?? ""}
              onChange={(e) =>
                update("embed_deleted_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_deleted_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_deleted_dm_color", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_deleted_dm_footer ?? ""}
                onChange={(e) =>
                  update("embed_deleted_dm_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Author</label>
              <input
                type="text"
                value={form.embed_deleted_dm_author_name ?? ""}
                onChange={(e) =>
                  update("embed_deleted_dm_author_name", e.target.value)
                }
              />
            </div>
            {checkbox(
              "embed_deleted_dm_thumbnail_enabled",
              "Show thumbnail",
              true
            )}
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 140 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_deleted_dm_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_deleted_dm_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Cancellation logs (grouped) */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">
            Cancellation logs (staff channel)
          </h3>
          <p className="dashboard-card-desc">
            Requested – when a user asks to cancel. Approved – when staff
            approves. Rejected – when staff rejects.
          </p>

          <h4 style={{ marginTop: 16, marginBottom: 8 }}>Requested</h4>
          <EmbedPreview type="cancel_requested" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.embed_cancel_requested_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_requested_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_cancel_requested_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_requested_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Description (use {"{requestId}"})</label>
            <input
              type="text"
              value={form.embed_cancel_requested_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_requested_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_cancel_requested_footer ?? ""}
                onChange={(e) =>
                  update("embed_cancel_requested_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 120 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_cancel_requested_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_cancel_requested_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Approved</h4>
          <EmbedPreview type="cancel_approved" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.embed_cancel_approved_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_approved_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_cancel_approved_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_approved_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_cancel_approved_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_approved_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_cancel_approved_footer ?? ""}
                onChange={(e) =>
                  update("embed_cancel_approved_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 120 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_cancel_approved_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_cancel_approved_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Rejected</h4>
          <EmbedPreview type="cancel_rejected" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_cancel_rejected_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_rejected_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_footer ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_footer", e.target.value)
                }
              />
            </div>
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            <div className="dashboard-form-group" style={{ minWidth: 120 }}>
              <label>Field 1 (Requester)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_1_name ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_field_1_name", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group" style={{ minWidth: 120 }}>
              <label>Field 2 (Rejected by)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_2_name ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_field_2_name", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group" style={{ minWidth: 140 }}>
              <label>Requester&apos;s reason (field)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_reason_name ?? ""}
                onChange={(e) =>
                  update(
                    "embed_cancel_rejected_field_reason_name",
                    e.target.value
                  )
                }
              />
            </div>
            <div className="dashboard-form-group" style={{ minWidth: 140 }}>
              <label>Staff&apos;s reason (field)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_staff_reason_name ?? ""}
                onChange={(e) =>
                  update(
                    "embed_cancel_rejected_field_staff_reason_name",
                    e.target.value
                  )
                }
              />
            </div>
            <div className="dashboard-form-group" style={{ minWidth: 120 }}>
              <label>Field 3 (Request title)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_3_name ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_field_3_name", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group" style={{ minWidth: 120 }}>
              <label>Field 4 (Product URL)</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_field_4_name ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_field_4_name", e.target.value)
                }
              />
            </div>
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>
            Cancellation DMs (to requester)
          </h4>
          <p className="dashboard-card-desc" style={{ marginBottom: 16 }}>
            DMs sent when staff approves or rejects a cancellation request.
          </p>
          <EmbedPreview type="cancel_approved_dm" data={form} />
          <EmbedPreview type="cancel_rejected_dm" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Approved DM – Title</label>
              <input
                type="text"
                value={form.embed_cancel_approved_dm_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_approved_dm_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Approved DM – Color</label>
              <input
                type="text"
                value={form.embed_cancel_approved_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_approved_dm_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Approved DM – Description</label>
            <input
              type="text"
              value={form.embed_cancel_approved_dm_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_approved_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Approved DM – Footer</label>
            <input
              type="text"
              value={form.embed_cancel_approved_dm_footer ?? ""}
              onChange={(e) =>
                update("embed_cancel_approved_dm_footer", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Rejected DM – Title</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_dm_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_dm_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Rejected DM – Color</label>
              <input
                type="text"
                value={form.embed_cancel_rejected_dm_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_rejected_dm_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Rejected DM – Description</label>
            <input
              type="text"
              value={form.embed_cancel_rejected_dm_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_rejected_dm_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-group">
            <label>Rejected DM – Staff&apos;s reason (field name)</label>
            <input
              type="text"
              value={form.embed_cancel_rejected_dm_field_staff_reason_name ?? ""}
              onChange={(e) =>
                update(
                  "embed_cancel_rejected_dm_field_staff_reason_name",
                  e.target.value
                )
              }
              placeholder="Staff's reason"
            />
          </div>
          <div className="dashboard-form-group">
            <label>Rejected DM – Footer</label>
            <input
              type="text"
              value={form.embed_cancel_rejected_dm_footer ?? ""}
              onChange={(e) =>
                update("embed_cancel_rejected_dm_footer", e.target.value)
              }
            />
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Cancel deleted</h4>
          <p className="dashboard-card-desc" style={{ marginBottom: 16 }}>
            When staff permanently deletes a request. Placeholders: {"{title}"}{" "}
            = product/request title, {"{requestId}"} in footer.
          </p>
          <EmbedPreview type="cancel_deleted" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.embed_cancel_deleted_title ?? ""}
                onChange={(e) =>
                  update("embed_cancel_deleted_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_cancel_deleted_color ?? ""}
                onChange={(e) =>
                  update("embed_cancel_deleted_color", e.target.value)
                }
              />
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <input
              type="text"
              value={form.embed_cancel_deleted_description ?? ""}
              onChange={(e) =>
                update("embed_cancel_deleted_description", e.target.value)
              }
            />
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_cancel_deleted_footer ?? ""}
                onChange={(e) =>
                  update("embed_cancel_deleted_footer", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Author name</label>
              <input
                type="text"
                value={form.embed_cancel_deleted_author_name ?? ""}
                onChange={(e) =>
                  update("embed_cancel_deleted_author_name", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Author icon URL</label>
              <input
                type="text"
                value={form.embed_cancel_deleted_author_icon ?? ""}
                onChange={(e) =>
                  update("embed_cancel_deleted_author_icon", e.target.value)
                }
              />
            </div>
          </div>
          <div
            className="dashboard-form-row"
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="dashboard-form-group"
                style={{ minWidth: 120 }}
              >
                <label>Field {i} name</label>
                <input
                  type="text"
                  value={form[`embed_cancel_deleted_field_${i}_name`] ?? ""}
                  onChange={(e) =>
                    update(
                      `embed_cancel_deleted_field_${i}_name`,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Staff request */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Staff request</h3>
          <p className="dashboard-card-desc">
            Minimal embed for staff-only request notifications.
          </p>
          <EmbedPreview type="staff_request" data={form} />
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.embed_staff_request_title ?? ""}
                onChange={(e) =>
                  update("embed_staff_request_title", e.target.value)
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Color</label>
              <input
                type="text"
                value={form.embed_staff_request_color ?? ""}
                onChange={(e) =>
                  update("embed_staff_request_color", e.target.value)
                }
                placeholder="0x5865F2"
              />
            </div>
            <div className="dashboard-form-group">
              <label>Footer</label>
              <input
                type="text"
                value={form.embed_staff_request_footer ?? ""}
                onChange={(e) =>
                  update("embed_staff_request_footer", e.target.value)
                }
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
