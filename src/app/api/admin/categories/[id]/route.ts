import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { deleteCategory } from "@/lib/dal/categories";

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
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
