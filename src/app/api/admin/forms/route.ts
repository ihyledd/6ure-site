import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { listFormsWithSubmissionCount, createForm } from "@/lib/dal/forms";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const forms = await listFormsWithSubmissionCount();
  return NextResponse.json({ forms });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, description } = body;
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const form = await createForm({ title: title.trim(), description: description?.trim() || null });
  return NextResponse.json({ form });
}
