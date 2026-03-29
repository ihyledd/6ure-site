"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FormBuilderField } from "./FormBuilderField";
import { DescriptionEditor } from "./DescriptionEditor";
import type { ApplicationFormSectionData, ApplicationFormFieldData, ApplicationFieldType } from "./types";
import { FIELD_TYPE_LABELS } from "./types";

const FIELD_TYPES: ApplicationFieldType[] = [
  "SHORT_TEXT", "PARAGRAPH", "NUMBER", "AGE", "EMAIL", "PHONE", "URL", "DATE", "TIME", "TIME_RANGES",
  "MULTIPLE_CHOICE", "CHECKBOXES", "MULTI_SELECT", "DROPDOWN", "LINEAR_SCALE", "RATING", "YES_NO",
  "FILE_UPLOAD", "TIMEZONE", "PRONOUNS", "SECTION_HEADER",
];

type Props = {
  section: ApplicationFormSectionData;
  onSectionUpdate: (patch: Partial<ApplicationFormSectionData>) => void;
  onSectionDelete: () => void;
  onFieldUpdate: (fieldId: string, patch: Partial<ApplicationFormFieldData>) => void;
  onFieldDelete: (fieldId: string) => void;
  onOpenAddField: () => void;
  addFieldMode: boolean;
  onPickFieldType: (type: ApplicationFieldType) => void;
  onCancelAddField: () => void;
};

export function FormBuilderSection({
  section,
  onSectionUpdate,
  onSectionDelete,
  onFieldUpdate,
  onFieldDelete,
  onOpenAddField,
  addFieldMode,
  onPickFieldType,
  onCancelAddField,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`form-builder-section ${isDragging ? "form-builder-section-dragging" : ""}`}
    >
      <div className="form-builder-section-header">
        <div className="form-builder-drag-handle" {...attributes} {...listeners} title="Drag to reorder section">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
        <div className="form-builder-section-title-wrap">
          <input
            value={section.title ?? ""}
            onChange={(e) => onSectionUpdate({ title: e.target.value || null })}
            placeholder="Section title"
            className="form-builder-input form-builder-section-title"
          />
          <DescriptionEditor
            value={section.description ?? ""}
            onChange={(v) => onSectionUpdate({ description: v || null })}
            placeholder="Section description (optional) - supports **bold**, *italic*, lists…"
            rows={4}
          />
        </div>
        <button
          type="button"
          className="form-builder-btn-icon"
          onClick={onSectionDelete}
          title="Delete section"
        >
          ×
        </button>
      </div>
      <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="form-builder-fields">
          {section.fields.map((field) => (
            <FormBuilderField
              key={field.id}
              field={field}
              onUpdate={(patch) => onFieldUpdate(field.id, patch)}
              onDelete={() => onFieldDelete(field.id)}
            />
          ))}
        </div>
      </SortableContext>
      {addFieldMode ? (
        <div className="form-builder-type-picker">
          {FIELD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="form-builder-type-btn"
              onClick={() => onPickFieldType(t)}
            >
              {FIELD_TYPE_LABELS[t]}
            </button>
          ))}
          <button type="button" className="form-builder-add-field" onClick={onCancelAddField}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="form-builder-add-field" onClick={onOpenAddField}>
          + Add question
        </button>
      )}
    </div>
  );
}
