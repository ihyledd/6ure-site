import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { createField } from "@/lib/dal/forms";

const VALID_FIELD_TYPES = [
  "SHORT_TEXT", "PARAGRAPH", "NUMBER", "AGE", "EMAIL", "PHONE", "URL", "DATE", "TIME", "TIME_RANGES",
  "MULTIPLE_CHOICE", "CHECKBOXES", "MULTI_SELECT", "DROPDOWN", "LINEAR_SCALE", "RATING", "YES_NO",
  "FILE_UPLOAD", "TIMEZONE", "PRONOUNS", "SECTION_HEADER",
] as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: formId } = await params;
  const body = await req.json();
  const { sectionId, type, label, order } = body;

  const fieldType = VALID_FIELD_TYPES.includes(type as (typeof VALID_FIELD_TYPES)[number]) ? type : "SHORT_TEXT";
  const field = await createField(formId, {
    sectionId: sectionId || null,
    type: fieldType,
    label: label?.trim() || "Untitled",
    order: typeof order === "number" ? order : undefined,
  });
  return NextResponse.json({ field });
}
