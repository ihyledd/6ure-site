import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { getSubmissionById, getFormWithSectionsAndFields, updateSubmissionStatus } from "@/lib/dal/forms";
import { sendApplicationAcceptedEmail } from "@/lib/send-application-email";
import { assignDiscordRoleToUser } from "@/lib/discord-assign-role";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const submissionRow = await getSubmissionById(id);
  if (!submissionRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await getFormWithSectionsAndFields(submissionRow.formId);
  const form = formData
    ? {
        id: formData.form.id,
        title: formData.form.title,
        sections: formData.sections.map((s, i) => ({ ...s, fields: formData.sectionFields[i] ?? [] })),
        fields: formData.topLevelFields,
      }
    : null;

  await updateSubmissionStatus(id, action === "accept" ? "accepted" : "rejected");

  if (action === "accept" && form) {
    const answers: Record<string, unknown> =
      typeof submissionRow.answers === "string" ? JSON.parse(submissionRow.answers) : submissionRow.answers;
    const isEmail = (v: unknown): v is string =>
      typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    let email: string | undefined = [answers.email, answers.Email].find(isEmail) as string | undefined;
    if (!email) {
      const allFields = [
        ...(form.fields ?? []),
        ...(form.sections ?? []).flatMap((s: { fields: { id: string; type: string }[] }) => s.fields),
      ];
      const emailField = allFields.find((f: { type: string }) => f.type === "EMAIL");
      if (emailField && isEmail(answers[(emailField as { id: string }).id])) {
        email = answers[(emailField as { id: string }).id] as string;
      }
    }
    if (!email) {
      for (const v of Object.values(answers)) {
        if (isEmail(v)) {
          email = v;
          break;
        }
      }
    }
    if (email) {
      await sendApplicationAcceptedEmail(
        email,
        (answers.discord_username as string) ?? undefined,
        form.title
      );
    }
    // Assign Discord role if form has acceptedRoleId in theme
    if (formData) {
      const themeRaw = formData.form.theme;
      let acceptedRoleId: string | undefined;
      if (themeRaw != null) {
        try {
          const theme = typeof themeRaw === "string" ? JSON.parse(themeRaw) : themeRaw;
          acceptedRoleId = typeof theme.acceptedRoleId === "string" && theme.acceptedRoleId.trim()
            ? theme.acceptedRoleId.trim()
            : undefined;
        } catch {
          // ignore
        }
      }
      if (acceptedRoleId && submissionRow.userId) {
        await assignDiscordRoleToUser(submissionRow.userId, acceptedRoleId);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    email: (typeof submissionRow.answers === "string" ? JSON.parse(submissionRow.answers) : submissionRow.answers)?.email ?? null,
    submissionId: id,
  });
}
