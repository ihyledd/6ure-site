import { NextResponse } from "next/server";
import { listForms } from "@/lib/dal/forms";

export async function GET() {
  const forms = await listForms(true);
  return NextResponse.json({
    forms: forms.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      minAge: f.minAge,
      theme: f.theme,
    })),
  });
}
