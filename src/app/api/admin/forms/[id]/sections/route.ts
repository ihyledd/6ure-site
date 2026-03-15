import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { createSection } from "@/lib/dal/forms";

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
  const { title, description, order } = body;
  const section = await createSection(formId, {
    title: title?.trim() || "",
    description: description?.trim() || null,
    order: typeof order === "number" ? order : undefined,
  });
  return NextResponse.json({ section });
}
