import { NextResponse } from "next/server";
import { getFormWithSectionsAndFields } from "@/lib/dal/forms";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formRow = await getFormWithSectionsAndFields(id);
  if (!formRow || !formRow.form.isActive) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const form = {
    ...formRow.form,
    isActive: formRow.form.isActive,
    sections: formRow.sections.map((s, i) => ({
      ...s,
      fields: formRow.sectionFields[i] ?? [],
    })),
    fields: formRow.topLevelFields,
  };
  return NextResponse.json({ form });
}
