import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFaqsList, createFaq } from "@/lib/dal/faqs";

/** GET /api/faqs - List FAQs, optional ?category=general|membership */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const faqs = await getFaqsList({ category: category || undefined });
    return NextResponse.json(faqs);
  } catch (error) {
    console.error("[API] GET /api/faqs:", error);
    return NextResponse.json(
      { error: "Failed to fetch FAQs" },
      { status: 500 }
    );
  }
}

/** POST /api/faqs - Create FAQ (staff only) */
export async function POST(req: Request) {
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

  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required (non-empty after trimming)" },
        { status: 400 }
      );
    }

    const category =
      body.category === "membership" ? "membership" : "general";
    const order_index =
      typeof body.order_index === "number" ? body.order_index : 0;

    const id = await createFaq({ question, answer, category, order_index });

    let created:
      | Awaited<ReturnType<typeof getFaqsList>>[number]
      | null = null;
    try {
      const list = await getFaqsList();
      created = list.find((f) => f.id === id) ?? null;
    } catch (listErr) {
      console.error("[API] POST /api/faqs: getFaqsList after insert failed (insert may have succeeded):", listErr);
    }

    return NextResponse.json(
      created ?? { id, question, answer, order_index, category },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] POST /api/faqs:", msg, error);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Failed to create FAQ",
        ...(isDev ? { detail: msg } : {}),
      },
      { status: 500 }
    );
  }
}
