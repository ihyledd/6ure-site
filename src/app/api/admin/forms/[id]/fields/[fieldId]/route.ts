import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { updateField, deleteField, getFieldById } from "@/lib/dal/forms";

const VALID_FIELD_TYPES = [
  "SHORT_TEXT", "PARAGRAPH", "NUMBER", "AGE", "EMAIL", "PHONE", "URL", "DATE", "TIME", "TIME_RANGES",
  "MULTIPLE_CHOICE", "CHECKBOXES", "MULTI_SELECT", "DROPDOWN", "LINEAR_SCALE", "RATING", "YES_NO",
  "FILE_UPLOAD", "TIMEZONE", "PRONOUNS", "SECTION_HEADER",
] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fieldId } = await params;
  const body = await req.json();
  const {
    type,
    label,
    description,
    required,
    placeholder,
    options,
    validation,
    autoFill,
    sectionId,
    order,
    fileConfig,
    scaleConfig,
  } = body;

  const data: Record<string, unknown> = {};
  if (VALID_FIELD_TYPES.includes(type as (typeof VALID_FIELD_TYPES)[number])) data.type = type;
  if (label !== undefined) data.label = label?.trim() ?? "Untitled";
  if (description !== undefined) data.description = description?.trim() || null;
  if (typeof required === "boolean") data.required = required;
  if (placeholder !== undefined) data.placeholder = placeholder?.trim() || null;
  if (options !== undefined) data.options = typeof options === "object" ? JSON.stringify(options) : options;
  if (validation !== undefined) data.validation = typeof validation === "object" ? JSON.stringify(validation) : validation;
  if (autoFill !== undefined) data.autoFill = autoFill === null ? null : String(autoFill);
  if (sectionId !== undefined) data.sectionId = sectionId || null;
  if (typeof order === "number") data.order = order;
  if (fileConfig !== undefined) data.fileConfig = typeof fileConfig === "object" ? JSON.stringify(fileConfig) : fileConfig;
  if (scaleConfig !== undefined) data.scaleConfig = typeof scaleConfig === "object" ? JSON.stringify(scaleConfig) : scaleConfig;

  await updateField(fieldId, data as Partial<import("@/lib/dal/forms").ApplicationFormFieldRow>);
  const field = await getFieldById(fieldId);
  return NextResponse.json({ field: field ?? { id: fieldId } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fieldId } = await params;
  await deleteField(fieldId);
  return NextResponse.json({ ok: true });
}
