import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFaqsList, updateFaq, deleteFaq } from "@/lib/dal/faqs";

/** PUT /api/faqs/[id] - Update FAQ (staff only) */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const faqId = parseInt(id, 10);
  if (isNaN(faqId) || faqId < 1) {
    return NextResponse.json(
      { error: "Invalid FAQ ID" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const updates: Parameters<typeof updateFaq>[1] = {};
    if (body.question !== undefined) updates.question = typeof body.question === "string" ? body.question.trim() : "";
    if (body.answer !== undefined) updates.answer = typeof body.answer === "string" ? body.answer : "";
    if (body.category !== undefined) updates.category = body.category === "membership" ? "membership" : "general";
    if (body.order_index !== undefined) updates.order_index = typeof body.order_index === "number" ? body.order_index : 0;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Provide at least one field to update" },
        { status: 400 }
      );
    }

    const ok = await updateFaq(faqId, updates);
    if (!ok) {
      return NextResponse.json(
        { error: "FAQ not found" },
        { status: 404 }
      );
    }

    const list = await getFaqsList();
    const updated = list.find((f) => f.id === faqId);
    return NextResponse.json(updated ?? { id: faqId, ...updates });
  } catch (error) {
    console.error("[API] PUT /api/faqs/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update FAQ" },
      { status: 500 }
    );
  }
}

/** DELETE /api/faqs/[id] - Delete FAQ (staff only) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Staff access required" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const faqId = parseInt(id, 10);
  if (isNaN(faqId) || faqId < 1) {
    return NextResponse.json(
      { error: "Invalid FAQ ID" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteFaq(faqId);
    if (!deleted) {
      return NextResponse.json(
        { error: "FAQ not found" },
        { status: 404 }
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] DELETE /api/faqs/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete FAQ" },
      { status: 500 }
    );
  }
}
