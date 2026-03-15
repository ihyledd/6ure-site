import { requireAdmin } from "@/lib/require-admin";
import { getFormWithSectionsAndFields } from "@/lib/dal/forms";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ApplyPageClient } from "@/app/apply/ApplyPageClient";

type Props = { params: Promise<{ id: string }> };

function mapField(f: { id: string; type: string; label: string; description: string | null; required: boolean; placeholder: string | null; options: string | null; autoFill: string | null; scaleConfig: string | null; fileConfig: string | null; validation: string | null }) {
  return {
    id: f.id,
    type: f.type,
    label: f.label,
    description: f.description,
    required: f.required,
    placeholder: f.placeholder,
    options: f.options,
    autoFill: f.autoFill,
    scaleConfig: f.scaleConfig,
    fileConfig: f.fileConfig,
    validation: f.validation,
  };
}

export default async function FormPreviewPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const session = await auth();

  const formRow = await getFormWithSectionsAndFields(id);
  if (!formRow) notFound();

  const formData = {
    id: formRow.form.id,
    title: formRow.form.title,
    description: formRow.form.description,
    confirmationMessage: formRow.form.confirmationMessage,
    minAge: formRow.form.minAge,
    fields: formRow.topLevelFields.map(mapField),
    sections: formRow.sections.map((s, i) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      fields: (formRow.sectionFields[i] ?? []).map(mapField),
    })),
  };

  return (
    <div className="apply-page">
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto 20px",
          padding: "12px 16px",
          background: "rgba(var(--accent-rgb), 0.15)",
          border: "1px solid rgba(var(--accent-rgb), 0.3)",
          borderRadius: 10,
          fontSize: 14,
          color: "var(--text-secondary)",
        }}
      >
        <strong>Preview mode</strong> - Dev only. You can test the form; submissions are real.
      </div>
      <ApplyPageClient formId={formRow.form.id} session={session} initialForm={formData as never} />
    </div>
  );
}
