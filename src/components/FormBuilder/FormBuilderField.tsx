"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ApplicationFormFieldData, ApplicationFieldType, FieldOption } from "./types";
import { FIELD_TYPE_LABELS, CHOICE_FIELD_TYPES } from "./types";

type Props = {
  field: ApplicationFormFieldData;
  onUpdate: (patch: Partial<ApplicationFormFieldData>) => void;
  onDelete: () => void;
};

export function FormBuilderField({ field, onUpdate, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const choiceTypes = CHOICE_FIELD_TYPES.includes(field.type);
  const options = (field.options ?? []) as FieldOption[];

  const addOption = () => {
    onUpdate({
      options: [...options, { value: `opt_${Date.now()}`, label: "Option" }],
    });
  };

  const updateOption = (i: number, label: string, value?: string) => {
    const next = [...options];
    next[i] = { ...next[i], label, value: value ?? next[i].value };
    onUpdate({ options: next });
  };

  const removeOption = (i: number) => {
    onUpdate({ options: options.filter((_, j) => j !== i) });
  };

  if (field.type === "SECTION_HEADER") {
    return (
      <div ref={setNodeRef} style={style} className="form-builder-section-header-block">
        <div className="form-builder-drag-handle" {...attributes} {...listeners} title="Drag to reorder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
        <div className="form-builder-field-inner">
          <input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Section title"
            className="form-builder-input"
          />
          <input
            value={field.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value || null })}
            placeholder="Section description (optional)"
            className="form-builder-input form-builder-input-sub"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`form-builder-field ${isDragging ? "form-builder-field-dragging" : ""}`}
    >
      <div className="form-builder-drag-handle" {...attributes} {...listeners} title="Drag to reorder">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
      <div className="form-builder-field-main">
        <div className="form-builder-field-header">
          <select
            value={field.type}
            onChange={(e) => onUpdate({ type: e.target.value as ApplicationFieldType })}
            className="form-builder-field-type-select"
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="form-builder-field-actions">
            <label className="form-builder-check-wrap">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              className="form-builder-btn-icon"
              onClick={onDelete}
              title="Delete"
            >
              ×
            </button>
          </div>
        </div>
        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Question"
          className="form-builder-input"
        />
        <input
          value={field.description ?? ""}
          onChange={(e) => onUpdate({ description: e.target.value || null })}
          placeholder="Help text (optional)"
          className="form-builder-input form-builder-input-sub"
        />
        {!["PARAGRAPH", "SECTION_HEADER"].includes(field.type) && field.type !== "YES_NO" && (
          <input
            value={field.placeholder ?? ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value || null })}
            placeholder="Placeholder (optional)"
            className="form-builder-input form-builder-input-sub"
          />
        )}
        {(field.type === "SHORT_TEXT" || field.type === "PARAGRAPH") && (
          <div className="form-builder-validation">
            <span className="form-builder-validation-label">Length:</span>
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={(field.validation as { minLength?: number })?.minLength ?? ""}
              onChange={(e) => {
                const n = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onUpdate({
                  validation: { ...(field.validation as object), minLength: n ?? undefined },
                });
              }}
            />
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={(field.validation as { maxLength?: number })?.maxLength ?? ""}
              onChange={(e) => {
                const n = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onUpdate({
                  validation: { ...(field.validation as object), maxLength: n ?? undefined },
                });
              }}
            />
          </div>
        )}
        {(field.type === "NUMBER" || field.type === "AGE") && (
          <div className="form-builder-validation">
            <span className="form-builder-validation-label">Range:</span>
            <input
              type="number"
              placeholder="Min"
              value={(field.validation as { min?: number })?.min ?? ""}
              onChange={(e) => {
                const n = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onUpdate({
                  validation: { ...(field.validation as object), min: n ?? undefined },
                });
              }}
            />
            <input
              type="number"
              placeholder="Max"
              value={(field.validation as { max?: number })?.max ?? ""}
              onChange={(e) => {
                const n = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onUpdate({
                  validation: { ...(field.validation as object), max: n ?? undefined },
                });
              }}
            />
          </div>
        )}
        {["SHORT_TEXT", "PARAGRAPH", "NUMBER", "EMAIL", "PHONE", "URL", "TIMEZONE"].includes(field.type) && (
          <div className="form-builder-autofill-row">
            <span className="form-builder-validation-label">Auto-fill:</span>
            <select
              value={field.autoFill ?? ""}
              onChange={(e) => onUpdate({ autoFill: e.target.value || null })}
              className="form-builder-autofill-select"
            >
              <option value="">None</option>
              <option value="username">Discord username</option>
              <option value="user_id">Discord user ID</option>
              {field.type === "TIMEZONE" && <option value="timezone">Timezone (browser)</option>}
            </select>
          </div>
        )}
        {choiceTypes && (
          <div className="form-builder-options">
            {options.map((opt, i) => (
              <div key={i} className="form-builder-option-row">
                <input
                  value={opt.label}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="form-builder-input form-builder-option-input"
                  placeholder="Option"
                />
                <button
                  type="button"
                  className="form-builder-btn-icon"
                  onClick={() => removeOption(i)}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="form-builder-add-option" onClick={addOption}>
              + Add option
            </button>
          </div>
        )}
        {(field.type === "LINEAR_SCALE" || field.type === "RATING") && (
          <div className="form-builder-scale-config">
            <input
              type="number"
              value={(field.scaleConfig as { min?: number })?.min ?? 1}
              onChange={(e) =>
                onUpdate({
                  scaleConfig: {
                    ...(field.scaleConfig as object),
                    min: parseInt(e.target.value, 10) || 1,
                  },
                })
              }
            />
            <span>to</span>
            <input
              type="number"
              value={(field.scaleConfig as { max?: number })?.max ?? 5}
              onChange={(e) =>
                onUpdate({
                  scaleConfig: {
                    ...(field.scaleConfig as object),
                    max: parseInt(e.target.value, 10) || 5,
                  },
                })
              }
            />
          </div>
        )}
        {field.type === "FILE_UPLOAD" && (
          <div className="form-builder-file-config">
            <input
              placeholder="Max size (MB)"
              type="number"
              value={((field.fileConfig as { maxSize?: number })?.maxSize ?? 0) / 1024 / 1024 || ""}
              onChange={(e) => {
                const mb = parseInt(e.target.value, 10);
                onUpdate({
                  fileConfig: {
                    ...(field.fileConfig as object),
                    maxSize: mb ? mb * 1024 * 1024 : undefined,
                  },
                });
              }}
            />
            <input
              placeholder="Allowed types (e.g. pdf, png)"
              value={((field.fileConfig as { allowedTypes?: string[] })?.allowedTypes ?? []).join(", ")}
              onChange={(e) =>
                onUpdate({
                  fileConfig: {
                    ...(field.fileConfig as object),
                    allowedTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
