import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { updateSection, deleteSection, getSectionById } from "@/lib/dal/forms";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sectionId } = await params;
  const body = await req.json();
  const { title, description, order } = body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title?.trim() ?? "";
  if (description !== undefined) data.description = description?.trim() || null;
  if (typeof order === "number") data.order = order;

  await updateSection(sectionId, data as { title?: string; description?: string | null; order?: number });
  const section = await getSectionById(sectionId);
  return NextResponse.json({ section: section ?? { id: sectionId, formId: "", order: 0, title: null, description: null } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sectionId } = await params;
  await deleteSection(sectionId);
  return NextResponse.json({ ok: true });
}
