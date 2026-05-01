import { requireAdmin } from "@/lib/require-admin";
import { FormBuilder } from "@/components/FormBuilder/FormBuilder";

type Props = { params: Promise<{ id: string }> };

export default async function EditFormPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  return <FormBuilder formId={id} />;
}
