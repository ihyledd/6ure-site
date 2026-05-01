import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { listSubmissions, getFormWithSectionsAndFields } from "@/lib/dal/forms";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const showResolved = searchParams.get("showResolved") === "true";

  const rows = await listSubmissions(showResolved);
  const submissions = await Promise.all(
    rows.map(async (row) => {
      const fw = await getFormWithSectionsAndFields(row.formId);
      const form = fw
        ? {
            id: fw.form.id,
            title: fw.form.title,
            fields: fw.topLevelFields.map((f) => ({ id: f.id, label: f.label })),
            sections: fw.sections.map((s, i) => ({
              fields: (fw.sectionFields[i] ?? []).map((f) => ({ id: f.id, label: f.label })),
            })),
          }
        : { id: row.formId, title: "", fields: [] as { id: string; label: string }[], sections: [] as { fields: { id: string; label: string }[] }[] };
      const createdAt =
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? "");
      const respondedAt =
        row.respondedAt == null
          ? null
          : row.respondedAt instanceof Date
            ? row.respondedAt.toISOString()
            : String(row.respondedAt);
      let answers: Record<string, unknown> = {};
      try {
        answers = typeof row.answers === "string" ? JSON.parse(row.answers || "{}") : (row.answers ?? {});
      } catch {
        // leave empty
      }
      return {
        id: row.id,
        formId: row.formId,
        userId: row.userId,
        username: row.username,
        status: row.status,
        answers,
        createdAt,
        respondedAt,
        form,
      };
    })
  );
  return NextResponse.json({ submissions });
}
