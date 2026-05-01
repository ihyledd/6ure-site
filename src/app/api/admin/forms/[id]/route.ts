import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { getFormWithSectionsAndFields, updateForm, deleteForm } from "@/lib/dal/forms";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const formRow = await getFormWithSectionsAndFields(id);
  if (!formRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const f = formRow.form;
  const form = {
    ...f,
    description: f.description ?? null,
    sections: formRow.sections.map((s, i) => ({ ...s, fields: formRow.sectionFields[i] ?? [] })),
    fields: formRow.topLevelFields,
  };
  return NextResponse.json({ form });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body == null || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }
  const {
    title,
    confirmationMessage,
    isActive,
    minAge,
    limitType,
    limitWindowDays,
    limitPerForm,
    maxResponses,
    theme,
  } = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof title === "string") data.title = title.trim();
  if ("description" in body) data.description = (body.description == null || body.description === "") ? null : String(body.description).trim();
  if (confirmationMessage !== undefined) data.confirmationMessage = confirmationMessage != null ? String(confirmationMessage).trim() || null : null;
  if (typeof isActive === "boolean") data.isActive = isActive;
  if (typeof minAge === "number" && minAge >= 0) data.minAge = minAge;
  if (minAge === null) data.minAge = null;
  if (limitType === "NONE" || limitType === "PER_FORM" || limitType === "GLOBAL") data.limitType = limitType;
  if (typeof limitWindowDays === "number") data.limitWindowDays = limitWindowDays;
  if (typeof limitPerForm === "number") data.limitPerForm = limitPerForm;
  if (maxResponses === null || maxResponses === undefined) data.maxResponses = null;
  else if (typeof maxResponses === "number") data.maxResponses = maxResponses;
  if (theme !== undefined) data.theme = typeof theme === "object" && theme !== null ? JSON.stringify(theme) : theme;

  try {
    const form = await updateForm(id, data as Parameters<typeof updateForm>[1]);
    return NextResponse.json({ form });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/forms/[id]]", err);
    return NextResponse.json({ error: "Update failed", detail: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteForm(id);
  return NextResponse.json({ ok: true });
}
