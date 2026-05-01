import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { getSubmissionById, upsertApplicationLimitReset } from "@/lib/dal/forms";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const submission = await getSubmissionById(id);
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await upsertApplicationLimitReset(submission.userId, submission.formId);

  return NextResponse.json({ ok: true });
}
