import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllPromoPopups, createPromoPopup } from "@/lib/dal/promo-popups";

/** GET - List all promo popups (admin) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const list = await getAllPromoPopups();
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([]);
  }
}

/** POST - Create promo popup (admin) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const features = Array.isArray(body.features)
      ? body.features.filter((x: unknown) => typeof x === "string")
      : typeof body.features === "string"
        ? body.features.split("\n").map((s: string) => s.trim()).filter(Boolean)
        : [];
    const id = await createPromoPopup({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      features,
      ctaText: typeof body.ctaText === "string" ? body.ctaText.trim() || null : null,
      ctaUrl: typeof body.ctaUrl === "string" ? body.ctaUrl.trim() || null : null,
      active: Boolean(body.active),
    });
    const list = await getAllPromoPopups();
    const created = list.find((p) => p.id === id);
    return NextResponse.json(created ?? { id, title, description: null, imageUrl: null, features: [], ctaText: null, ctaUrl: null, active: false }, { status: 201 });
  } catch (err) {
    console.error("[API] POST /api/admin/promo-popups:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
