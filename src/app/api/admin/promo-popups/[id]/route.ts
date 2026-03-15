import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllPromoPopups, updatePromoPopup, deletePromoPopup } from "@/lib/dal/promo-popups";

/** PUT - Update promo popup (admin) */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  const { id } = await params;
  const pid = parseInt(id, 10);
  if (isNaN(pid) || pid < 1) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const updates: Parameters<typeof updatePromoPopup>[1] = {};
    if (body.title !== undefined) updates.title = typeof body.title === "string" ? body.title.trim() : "";
    if (body.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.imageUrl !== undefined) updates.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
    if (body.features !== undefined) {
      updates.features = Array.isArray(body.features)
        ? body.features.filter((x: unknown) => typeof x === "string")
        : typeof body.features === "string"
          ? body.features.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : [];
    }
    if (body.ctaText !== undefined) updates.ctaText = typeof body.ctaText === "string" ? body.ctaText.trim() || null : null;
    if (body.ctaUrl !== undefined) updates.ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() || null : null;
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Provide at least one field" }, { status: 400 });
    }
    const ok = await updatePromoPopup(pid, updates);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const list = await getAllPromoPopups();
    return NextResponse.json(list.find((p) => p.id === pid));
  } catch (err) {
    console.error("[API] PUT /api/admin/promo-popups/[id]:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/** DELETE - Delete promo popup (admin) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  const { id } = await params;
  const pid = parseInt(id, 10);
  if (isNaN(pid) || pid < 1) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  try {
    const ok = await deletePromoPopup(pid);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[API] DELETE /api/admin/promo-popups/[id]:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
