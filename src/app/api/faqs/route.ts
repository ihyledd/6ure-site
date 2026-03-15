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
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer : "";
    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    const category =
      body.category === "membership" ? "membership" : "general";
    const order_index =
      typeof body.order_index === "number" ? body.order_index : 0;

    const id = await createFaq({ question, answer, category, order_index });
    const list = await getFaqsList();
    const created = list.find((f) => f.id === id);
    return NextResponse.json(
      created ?? { id, question, answer, order_index, category },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/faqs:", error);
    return NextResponse.json(
      { error: "Failed to create FAQ" },
      { status: 500 }
    );
  }
}
