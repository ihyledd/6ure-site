"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FormBuilderSection } from "./FormBuilderSection";
import { FormBuilderField } from "./FormBuilderField";
import { DescriptionEditor } from "./DescriptionEditor";
import { FormIcon, FORM_ICON_KEYS, FORM_ICON_LABELS, type FormIconKey } from "@/lib/form-icons";
import type {
  ApplicationFormData,
  ApplicationFormSectionData,
  ApplicationFormFieldData,
  ApplicationFieldType,
} from "./types";
import { FIELD_TYPE_LABELS } from "./types";

type Props = { formId: string };

const FIELD_TYPES: ApplicationFieldType[] = [
  "SHORT_TEXT",
  "PARAGRAPH",
  "NUMBER",
  "AGE",
  "EMAIL",
  "PHONE",
  "URL",
  "DATE",
  "TIME",
  "TIME_RANGES",
  "MULTIPLE_CHOICE",
  "CHECKBOXES",
  "MULTI_SELECT",
  "DROPDOWN",
  "LINEAR_SCALE",
  "RATING",
  "YES_NO",
  "FILE_UPLOAD",
  "TIMEZONE",
  "PRONOUNS",
  "SECTION_HEADER",
];

function buildFieldIds(form: ApplicationFormData): { id: string; sectionId?: string }[] {
  const out: { id: string; sectionId?: string }[] = [];
  for (const f of form.fields) {
    out.push({ id: f.id, sectionId: f.sectionId ?? undefined });
  }
  for (const s of form.sections) {
    for (const f of s.fields) {
      out.push({ id: f.id, sectionId: s.id });
    }
  }
  return out;
}

export function FormBuilder({ formId }: Props) {
  const [form, setForm] = useState<ApplicationFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAddField, setShowAddField] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = useCallback(() => {
    fetch(`/api/admin/forms/${formId}`)
      .then((r) => r.json())
      .then((d) => {
        setForm(d.form);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [formId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveForm = async (patch: Partial<ApplicationFormData>): Promise<{ ok: boolean; message?: string }> => {
    if (!form) return { ok: false };
    const res = await fetch(`/api/admin/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data.detail ?? data.error ?? `HTTP ${res.status}`) as string;
      return { ok: false, message: msg };
    }
    const updated = data.form;
    if (updated) setForm((prev) => (prev ? { ...prev, ...updated } : null));
    return { ok: true };
  };

  const addSection = async () => {
    if (!form) return;
    setSaving(true);
    const res = await fetch(`/api/admin/forms/${formId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New section" }),
    });
    setSaving(false);
    if (res.ok) {
      const { section } = await res.json();
      setForm((prev) =>
        prev
          ? {
              ...prev,
              sections: [...prev.sections, { ...section, fields: [] }],
            }
          : null
      );
      showToast("Section added.", "success");
    } else showToast("Failed to add section.", "error");
  };

  const updateSection = (sectionId: string, patch: Partial<ApplicationFormSectionData>) => {
    if (!form) return;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId ? { ...s, ...patch } : s
            ),
          }
        : null
    );
  };

  const deleteSection = async (sectionId: string) => {
    if (!form || !confirm("Delete this section and all its questions?")) return;
    const res = await fetch(
      `/api/admin/forms/${formId}/sections/${sectionId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setForm((prev) =>
        prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) } : null
      );
      showToast("Section deleted.", "success");
    } else showToast("Failed to delete section.", "error");
  };

  const addField = async (sectionId: string | null, type: ApplicationFieldType) => {
    if (!form) return;
    setShowAddField(null);
    setSaving(true);
    const res = await fetch(`/api/admin/forms/${formId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId: sectionId || undefined,
        type,
        label: type === "SECTION_HEADER" ? "Section title" : type === "AGE" ? "How old are you?" : "Untitled",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { field } = await res.json();
      const newField = field as ApplicationFormFieldData;
      if (sectionId) {
        const section = form.sections.find((s) => s.id === sectionId);
        if (section) {
          setForm((prev) =>
            prev
              ? {
                  ...prev,
                  sections: prev.sections.map((s) =>
                    s.id === sectionId
                      ? { ...s, fields: [...s.fields, newField] }
                      : s
                  ),
                }
              : null
          );
        }
      } else {
        setForm((prev) =>
          prev ? { ...prev, fields: [...prev.fields, newField] } : null
        );
      }
      showToast("Question added.", "success");
    } else showToast("Failed to add question.", "error");
  };

  const updateField = (fieldId: string, patch: Partial<ApplicationFormFieldData>) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return null;
      const updateInFields = (arr: ApplicationFormFieldData[]) =>
        arr.map((f) => (f.id === fieldId ? { ...f, ...patch } : f));
      return {
        ...prev,
        fields: updateInFields(prev.fields),
        sections: prev.sections.map((s) => ({
          ...s,
          fields: updateInFields(s.fields),
        })),
      };
    });
  };

  const saveAllChanges = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const formResult = await saveForm({
        title: form.title,
        description: form.description ?? null,
        confirmationMessage: form.confirmationMessage ?? null,
        isActive: form.isActive,
        minAge: form.minAge,
        limitType: form.limitType,
        limitWindowDays: form.limitWindowDays,
        limitPerForm: form.limitPerForm,
        maxResponses: form.maxResponses ?? null,
        theme: form.theme,
      });
      if (!formResult.ok) {
        showToast(formResult.message ? `Failed to save: ${formResult.message}` : "Failed to save form.", "error");
        setSaving(false);
        return;
      }
      await Promise.all(
        form.sections.map((s) =>
          fetch(`/api/admin/forms/${formId}/sections/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: s.title,
              description: s.description,
            }),
          })
        )
      );
      const allFields = [
        ...form.fields,
        ...form.sections.flatMap((s) => s.fields),
      ];
      await Promise.all(
        allFields.map((f) =>
          fetch(`/api/admin/forms/${formId}/fields/${f.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: f.type,
              label: f.label,
              description: f.description,
              required: f.required,
              placeholder: f.placeholder,
              options: f.options,
              validation: f.validation,
              autoFill: f.autoFill,
              shuffleOptions: f.shuffleOptions,
              conditionalLogic: f.conditionalLogic,
              fileConfig: f.fileConfig,
              scaleConfig: f.scaleConfig,
            }),
          })
        )
      );
      showToast("Changes saved.", "success");
    } catch {
      showToast("Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteField = async (fieldId: string) => {
    if (!form || !confirm("Delete this question?")) return;
    const res = await fetch(
      `/api/admin/forms/${formId}/fields/${fieldId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setForm((prev) => {
        if (!prev) return null;
        const filterFields = (arr: ApplicationFormFieldData[]) =>
          arr.filter((f) => f.id !== fieldId);
        return {
          ...prev,
          fields: filterFields(prev.fields),
          sections: prev.sections.map((s) => ({
            ...s,
            fields: filterFields(s.fields),
          })),
        };
      });
      showToast("Question deleted.", "success");
    } else showToast("Failed to delete question.", "error");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !form) return;

    const allIds = [
      ...form.sections.map((s) => s.id),
      ...form.fields.map((f) => f.id),
      ...form.sections.flatMap((s) => s.fields.map((f) => f.id)),
    ];

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeIsSection = form.sections.some((s) => s.id === activeId);
    const overIsSection = form.sections.some((s) => s.id === overId);

    if (activeIsSection && overIsSection) {
      const idxA = form.sections.findIndex((s) => s.id === activeId);
      const idxB = form.sections.findIndex((s) => s.id === overId);
      if (idxA >= 0 && idxB >= 0) {
        const reordered = arrayMove(form.sections, idxA, idxB);
        setForm((prev) => (prev ? { ...prev, sections: reordered } : null));
        fetch(`/api/admin/forms/${formId}/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionIds: reordered.map((s) => s.id),
          }),
        });
      }
      return;
    }

    const activeField = form.fields.find((f) => f.id === activeId) ??
      form.sections.flatMap((s) => s.fields).find((f) => f.id === activeId);
    const overField = form.fields.find((f) => f.id === overId) ??
      form.sections.flatMap((s) => s.fields).find((f) => f.id === overId);

    if (activeField && overField) {
      const activeSectionId = activeField.sectionId;
      const overSectionId = overField.sectionId;
      if (activeSectionId !== overSectionId) return;

      if (activeSectionId) {
        const section = form.sections.find((s) => s.id === activeSectionId);
        if (section) {
          const idxA = section.fields.findIndex((f) => f.id === activeId);
          const idxB = section.fields.findIndex((f) => f.id === overId);
          if (idxA >= 0 && idxB >= 0) {
            const reordered = arrayMove(section.fields, idxA, idxB);
            setForm((prev) =>
              prev
                ? {
                    ...prev,
                    sections: prev.sections.map((s) =>
                      s.id === activeSectionId ? { ...s, fields: reordered } : s
                    ),
                  }
                : null
            );
            fetch(`/api/admin/forms/${formId}/reorder`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fieldIds: reordered.map((f) => ({ id: f.id, sectionId: activeSectionId })),
              }),
            });
          }
        }
      } else {
        const idxA = form.fields.findIndex((f) => f.id === activeId);
        const idxB = form.fields.findIndex((f) => f.id === overId);
        if (idxA >= 0 && idxB >= 0) {
          const reordered = arrayMove(form.fields, idxA, idxB);
          setForm((prev) => (prev ? { ...prev, fields: reordered } : null));
          fetch(`/api/admin/forms/${formId}/reorder`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fieldIds: reordered.map((f) => ({ id: f.id })),
            }),
          });
        }
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  if (loading)
    return (
      <div style={{ padding: 24, color: "var(--text-tertiary)" }}>
        Loading…
      </div>
    );
  if (!form) return null;

  const allSortableIds = [
    ...form.sections.map((s) => s.id),
    ...form.fields.map((f) => f.id),
    ...form.sections.flatMap((s) => s.fields.map((f) => f.id)),
  ];

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2>Edit form</h2>
          <p>
            <Link href="/admin/forms" style={{ color: "var(--discord-blurple)" }}>
              Forms
            </Link>{" "}
            / {form.title}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-primary"
            onClick={saveAllChanges}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="dashboard-btn dashboard-btn-ghost"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            {settingsOpen ? "Hide settings" : "Form settings"}
          </button>
          <Link
            href={`/admin/forms/${form.id}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-btn dashboard-btn-ghost"
          >
            Preview (dev)
          </Link>
        </div>
      </div>

      {toast && (
        <div className={`dashboard-toast dashboard-toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {settingsOpen && (
        <div className="dashboard-card form-builder-settings">
          <h3 className="dashboard-card-title">Form settings</h3>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => (p ? { ...p, title: e.target.value } : null))}
              />
            </div>
            <div className="dashboard-form-group">
              <label>Card icon</label>
              <div className="form-icon-picker">
                {FORM_ICON_KEYS.map((key) => {
                  const theme = (form.theme ?? {}) as { icon?: string };
                  const selected = (theme?.icon as FormIconKey) ?? "clipboard";
                  return (
                    <button
                      key={key}
                      type="button"
                      title={FORM_ICON_LABELS[key]}
                      className={`form-icon-picker-btn${selected === key ? " form-icon-picker-btn-selected" : ""}`}
                      onClick={() =>
                        setForm((p) =>
                          p
                            ? {
                                ...p,
                                theme: { ...((p.theme ?? {}) as object), icon: key },
                              }
                            : null
                        )
                      }
                    >
                      <FormIcon icon={key} size={20} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="dashboard-form-group">
            <label>Description</label>
            <DescriptionEditor
              value={form.description ?? ""}
              onChange={(v) =>
                setForm((p) => (p ? { ...p, description: v || null } : null))
              }
              placeholder="Intro text shown above the form (supports **bold**, *italic*, lists…)"
              rows={6}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Confirmation message (after submit)</label>
            <textarea
              value={form.confirmationMessage ?? ""}
              onChange={(e) =>
                setForm((p) =>
                  p ? { ...p, confirmationMessage: e.target.value || null } : null
                )
              }
              rows={2}
            />
          </div>
          <div className="dashboard-form-group">
            <label>Discord webhook (forum channel)</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={((form.theme ?? {}) as { discordWebhookUrl?: string }).discordWebhookUrl ?? ""}
              onChange={(e) =>
                setForm((p) =>
                  p
                    ? {
                        ...p,
                        theme: {
                          ...((p.theme ?? {}) as object),
                          discordWebhookUrl: e.target.value.trim() || undefined,
                        },
                      }
                    : null
                )
              }
            />
            <small style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
              New responses create a forum post. Webhook must be for a forum channel.
            </small>
          </div>
          <div className="dashboard-form-group">
            <label>Role to assign when accepted (Discord Role ID)</label>
            <input
              type="text"
              placeholder="e.g. 1234567890123456789"
              value={((form.theme ?? {}) as { acceptedRoleId?: string }).acceptedRoleId ?? ""}
              onChange={(e) =>
                setForm((p) =>
                  p
                    ? {
                        ...p,
                        theme: {
                          ...((p.theme ?? {}) as object),
                          acceptedRoleId: e.target.value.trim() || undefined,
                        },
                      }
                    : null
                )
              }
            />
            <small style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
              When an application is accepted, the applicant will be assigned this Discord role in your server. Enter the role ID (right-click role in Discord Server Settings → Copy ID).
            </small>
          </div>
          <div className="dashboard-form-row">
            <div className="dashboard-form-group">
              <label>Min age (optional)</label>
              <input
                type="number"
                min={0}
                value={form.minAge ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p!,
                    minAge: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Limit type</label>
              <select
                value={form.limitType}
                onChange={(e) =>
                  setForm((p) =>
                    p
                      ? {
                          ...p,
                          limitType: e.target.value as ApplicationFormData["limitType"],
                        }
                      : null
                  )
                }
              >
                <option value="NONE">None</option>
                <option value="PER_FORM">Per form</option>
                <option value="GLOBAL">Global</option>
              </select>
            </div>
            <div className="dashboard-form-group">
              <label>Window (days)</label>
              <input
                type="number"
                min={1}
                value={form.limitWindowDays}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, limitWindowDays: parseInt(e.target.value, 10) || 30 } : null))
                }
              />
            </div>
            <div className="dashboard-form-group">
              <label>Per form limit</label>
              <input
                type="number"
                min={1}
                value={form.limitPerForm}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, limitPerForm: parseInt(e.target.value, 10) || 1 } : null))
                }
              />
            </div>
          </div>
          <label className="dashboard-form-group-toggle-wrap" style={{ marginTop: 16 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((p) => (p ? { ...p, isActive: e.target.checked } : null))
              }
            />
            <span className="dashboard-toggle-label">Form is active (visible on /apply)</span>
          </label>
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--glass-border)" }}>
            <button
              type="button"
              className="dashboard-btn dashboard-btn-ghost dashboard-btn-danger"
              disabled={deleting}
              onClick={async () => {
                if (!confirm("Delete this form permanently? All sections, questions, and submissions will be removed. This cannot be undone.")) return;
                setDeleting(true);
                try {
                  const res = await fetch(`/api/admin/forms/${formId}`, { method: "DELETE" });
                  if (res.ok) router.push("/admin/forms");
                  else showToast("Failed to delete form.", "error");
                } catch {
                  showToast("Failed to delete form.", "error");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete form"}
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
          <div className="form-builder">
            {form.fields.length > 0 && (
              <div className="form-builder-block">
                <h4 className="form-builder-block-title">Form-level questions</h4>
                <div className="form-builder-fields">
                  {form.fields.map((field) => (
                    <FormBuilderField
                      key={field.id}
                      field={field}
                      onUpdate={(patch) => updateField(field.id, patch)}
                      onDelete={() => deleteField(field.id)}
                    />
                  ))}
                </div>
                {showAddField === "form" ? (
                  <div className="form-builder-type-picker">
                    {FIELD_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="form-builder-type-btn"
                        onClick={() => addField(null, t)}
                      >
                        {FIELD_TYPE_LABELS[t]}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="form-builder-add-field"
                      onClick={() => setShowAddField(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="form-builder-add-field"
                    onClick={() => setShowAddField("form")}
                  >
                    + Add question
                  </button>
                )}
              </div>
            )}

            {form.sections.map((section) => (
              <FormBuilderSection
                key={section.id}
                section={section}
                onSectionUpdate={(patch) => updateSection(section.id, patch)}
                onSectionDelete={() => deleteSection(section.id)}
                onFieldUpdate={updateField}
                onFieldDelete={deleteField}
                onOpenAddField={() => setShowAddField(section.id)}
                addFieldMode={showAddField === section.id}
                onPickFieldType={(type) => addField(section.id, type)}
                onCancelAddField={() => setShowAddField(null)}
              />
            ))}

            <div className="form-builder-actions">
              <button
                type="button"
                className="dashboard-btn dashboard-btn-ghost"
                onClick={addSection}
                disabled={saving}
              >
                + Add section
              </button>
              {form.fields.length === 0 && form.sections.length === 0 && (
                <button
                  type="button"
                  className="form-builder-add-field"
                  onClick={() => setShowAddField("form")}
                >
                  + Add first question
                </button>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
