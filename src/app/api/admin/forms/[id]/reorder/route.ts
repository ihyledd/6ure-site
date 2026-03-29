import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { updateSection, updateField } from "@/lib/dal/forms";

export async function PATCH(
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
  const { sectionIds, fieldIds } = body as {
    sectionIds?: string[];
    fieldIds?: { id: string; sectionId?: string }[];
  };

  if (Array.isArray(sectionIds)) {
    await Promise.all(
      sectionIds.map((sectionId: string, i: number) => updateSection(sectionId, { order: i }))
    );
  }

  if (Array.isArray(fieldIds)) {
    await Promise.all(
      fieldIds.map((item: { id: string; sectionId?: string }, i: number) =>
        updateField(item.id, { order: i, sectionId: item.sectionId ?? null })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
