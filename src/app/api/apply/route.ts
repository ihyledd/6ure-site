import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getFormByIdActive,
  getFormSections,
  getFormFieldsBySection,
  getApplicationLimitReset,
  countSubmissionsByUserFormSince,
  countSubmissionsByUserSince,
  countSubmissionsByForm,
  createSubmission,
  getFormFieldsByIds,
} from "@/lib/dal/forms";
import { sendApplicationToDiscord } from "@/lib/send-discord-webhook";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be logged in to apply." }, { status: 401 });
    }

    let body: { formId?: string; answers?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const { formId, answers } = body;
    if (!formId || typeof answers !== "object") {
      return NextResponse.json({ error: "formId and answers required" }, { status: 400 });
    }

  const formRow = await getFormByIdActive(formId);
  if (!formRow) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  const sections = await getFormSections(formId);
  const sectionFields = await Promise.all(
    sections.map((s) => getFormFieldsBySection(s.id, formId))
  );
  const topLevelFields = await getFormFieldsBySection(null, formId);

  let parsedTheme: Record<string, unknown> | null = null;
  if (formRow.theme != null) {
    if (typeof formRow.theme === "object" && formRow.theme !== null && !Array.isArray(formRow.theme)) {
      parsedTheme = formRow.theme as Record<string, unknown>;
    } else if (typeof formRow.theme === "string") {
      try {
        parsedTheme = JSON.parse(formRow.theme) as Record<string, unknown>;
      } catch {
        parsedTheme = null;
      }
    }
  }

  const form = {
    ...formRow,
    limitType: formRow.limitType as "NONE" | "PER_FORM" | "GLOBAL",
    limitWindowDays: formRow.limitWindowDays,
    limitPerForm: formRow.limitPerForm,
    maxResponses: formRow.maxResponses,
    minAge: formRow.minAge,
    confirmationMessage: formRow.confirmationMessage,
    theme: parsedTheme,
    fields: topLevelFields,
    sections: sections.map((s, i) => ({ ...s, fields: sectionFields[i] ?? [] })),
  };

  const userId = session.user.id;
  const username = (session.user as { username?: string | null }).username ?? session.user.name ?? null;

  const limitType = form.limitType;
  const windowDays = form.limitWindowDays;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  if (limitType === "PER_FORM" || limitType === "GLOBAL") {
    const reset = await getApplicationLimitReset(userId, formId);
    const effectiveStart =
      reset && new Date(reset.resetAt).getTime() > windowStart.getTime() ? new Date(reset.resetAt) : windowStart;

    const priorCount =
      limitType === "PER_FORM"
        ? await countSubmissionsByUserFormSince(userId, formId, effectiveStart)
        : await countSubmissionsByUserSince(userId, effectiveStart);

    const maxAllowed = form.limitPerForm;
    if (priorCount >= maxAllowed) {
      return NextResponse.json(
        { error: `You can only submit ${maxAllowed} application(s) per ${windowDays} days.` },
        { status: 429 }
      );
    }
  }

  if (form.maxResponses != null) {
    const total = await countSubmissionsByForm(formId);
    if (total >= form.maxResponses) {
      return NextResponse.json(
        { error: "This form is no longer accepting submissions." },
        { status: 429 }
      );
    }
  }

  const allFields = [
    ...form.fields,
    ...form.sections.flatMap((s) => s.fields),
  ];

  const minAge = form.minAge != null ? Number(form.minAge) : null;
  if (minAge != null && minAge > 0) {
    const ageField = allFields.find(
      (f) =>
        String(f.type).toUpperCase() === "AGE" ||
        (f.type === "NUMBER" && (f.label.toLowerCase().includes("how old") || f.id === "age" || f.id === "Age"))
    );
    const raw = ageField ? (answers as Record<string, unknown>)[ageField.id] : (answers as Record<string, unknown>).age ?? (answers as Record<string, unknown>).Age;
    const rawVal = Array.isArray(raw) ? raw[0] : raw;
    const age = typeof rawVal === "number" ? rawVal : parseInt(String(rawVal ?? "").trim(), 10);
    if (isNaN(age) || age < minAge) {
      return NextResponse.json(
        { error: `You must be at least ${minAge} years old to apply.` },
        { status: 400 }
      );
    }
  }

  const mergedAnswers: Record<string, string | string[]> = { ...(answers as Record<string, string | string[]>) };
  for (const f of allFields) {
    if (f.autoFill === "username") mergedAnswers[f.id] = username ?? "";
    else if (f.autoFill === "user_id") mergedAnswers[f.id] = userId;
    else if (f.autoFill === "timezone") {
      const tz = ((answers as Record<string, unknown>).timezone ?? (answers as Record<string, unknown>).Timezone ?? "").toString();
      if (tz) mergedAnswers[f.id] = tz;
    }
  }
  mergedAnswers.discord_user_id = userId;
  mergedAnswers.discord_username = username ?? "";

  let submissionId: string;
  try {
    submissionId = await createSubmission(formId, userId, username, mergedAnswers as unknown as Record<string, unknown>);
  } catch {
    return NextResponse.json(
      { error: "Could not save your application. Please try again." },
      { status: 500 }
    );
  }

  const theme = (form.theme ?? {}) as { discordWebhookUrl?: string };
  const webhookUrl = theme?.discordWebhookUrl?.trim();
  if (webhookUrl) {
    const labelMap = new Map(allFields.map((f) => [f.id, f.label]));
    const orderedIds = allFields.map((f) => f.id);
    const answerKeys = Object.keys(mergedAnswers);
    const missingIds = answerKeys.filter((k) => !labelMap.has(k) && k !== "discord_user_id" && k !== "discord_username");
    if (missingIds.length > 0) {
      const missingFields = await getFormFieldsByIds(missingIds, formId);
      for (const f of missingFields) labelMap.set(f.id, f.label);
    }
    const entries = [...orderedIds, ...answerKeys.filter((k) => !orderedIds.includes(k))]
      .filter((key) => {
        const v = mergedAnswers[key];
        return v != null && (typeof v === "string" ? v : v.length) !== "";
      })
      .map((key) => ({
        label: labelMap.get(key) ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: (() => {
          const v = mergedAnswers[key];
          return Array.isArray(v) ? v.join(", ") : String(v);
        })(),
      }));

    sendApplicationToDiscord({
      webhookUrl,
      formTitle: form.title,
      applicantUsername: username ?? null,
      applicantUserId: userId,
      entries,
      asForumPost: true,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    confirmationMessage: form.confirmationMessage ?? "Thank you for your application.",
  });
  } catch (err) {
    console.error("[API] POST /api/apply:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
