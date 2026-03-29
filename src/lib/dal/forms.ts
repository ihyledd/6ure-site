import { query, queryOne, execute } from "@/lib/db";

export interface ApplicationFormRow {
  id: string;
  title: string;
  description: string | null;
  confirmationMessage: string | null;
  isActive: boolean;
  minAge: number | null;
  limitType: string;
  limitWindowDays: number;
  limitPerForm: number;
  maxResponses: number | null;
  theme: string | null;
}

export interface ApplicationFormSectionRow {
  id: string;
  formId: string;
  order: number;
  title: string | null;
  description: string | null;
}

export interface ApplicationFormFieldRow {
  id: string;
  formId: string;
  sectionId: string | null;
  order: number;
  type: string;
  label: string;
  description: string | null;
  required: boolean;
  placeholder: string | null;
  options: string | null;
  validation: string | null;
  autoFill: string | null;
  scaleConfig: string | null;
  fileConfig: string | null;
}

export async function listForms(activeOnly = false): Promise<ApplicationFormRow[]> {
  const where = activeOnly ? "WHERE isActive = true" : "";
  return query<ApplicationFormRow>(
    `SELECT id, title, description, confirmationMessage, isActive, minAge, limitType, limitWindowDays, limitPerForm, maxResponses, theme FROM ApplicationForm ${where} ORDER BY updatedAt DESC`,
    []
  );
}

export async function getFormWithSectionsAndFields(formId: string): Promise<{
  form: ApplicationFormRow;
  sections: ApplicationFormSectionRow[];
  sectionFields: ApplicationFormFieldRow[][];
  topLevelFields: ApplicationFormFieldRow[];
} | null> {
  const form = await getFormById(formId);
  if (!form) return null;
  const sections = await getFormSections(formId);
  const sectionFields = await Promise.all(sections.map((s) => getFormFieldsBySection(s.id, formId)));
  const topLevelFields = await getFormFieldsBySection(null, formId);
  return { form, sections, sectionFields, topLevelFields };
}

/** Plain serializable shape for form on submission (no DB driver types). */
export type SubmissionFormShape = {
  id: string;
  title: string;
  theme: string;
  fields: { id: string; label: string }[];
  sections: { id: string; title: string | null; description: string | null; order: number; fields: { id: string; label: string }[] }[];
};

export async function getSubmissionsByUserId(userId: string): Promise<{
  id: string;
  formId: string;
  status: string;
  answers: string;
  createdAt: string;
  form: SubmissionFormShape;
}[]> {
  const rows = await query<{ id: string; formId: string; status: string; answers: string; createdAt: Date | string }>(
    "SELECT id, formId, status, answers, createdAt FROM ApplicationSubmission WHERE userId = ? ORDER BY createdAt DESC",
    [userId]
  );
  const result: {
    id: string;
    formId: string;
    status: string;
    answers: string;
    createdAt: string;
    form: SubmissionFormShape;
  }[] = [];
  for (const row of rows) {
    const fw = await getFormWithSectionsAndFields(row.formId);
    if (!fw) continue;
    const rawTheme = fw.form.theme;
    const themeStr =
      rawTheme == null
        ? ""
        : typeof rawTheme === "string"
          ? rawTheme
          : typeof rawTheme === "object"
            ? JSON.stringify(rawTheme)
            : String(rawTheme);
    const form: SubmissionFormShape = {
      id: String(fw.form.id),
      title: String(fw.form.title ?? ""),
      theme: themeStr,
      fields: (fw.topLevelFields ?? []).map((f) => ({
        id: String(f.id),
        label: String(f.label ?? ""),
      })),
      sections: (fw.sections ?? []).map((s, i) => ({
        id: String(s.id),
        title: s.title != null ? String(s.title) : null,
        description: s.description != null ? String(s.description) : null,
        order: Number(s.order ?? 0),
        fields: (fw.sectionFields[i] ?? []).map((f) => ({
          id: String(f.id),
          label: String(f.label ?? ""),
        })),
      })),
    };
    const createdAt =
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? "");
    result.push({
      id: row.id,
      formId: row.formId,
      status: row.status,
      answers: row.answers,
      createdAt,
      form,
    });
  }
  return result;
}

export async function getFormById(formId: string): Promise<ApplicationFormRow | null> {
  const row = await queryOne<ApplicationFormRow>(
    "SELECT id, title, description, confirmationMessage, isActive, minAge, limitType, limitWindowDays, limitPerForm, maxResponses, theme FROM ApplicationForm WHERE id = ?",
    [formId]
  );
  return row ?? null;
}

export async function getFormByIdActive(formId: string): Promise<ApplicationFormRow | null> {
  const row = await queryOne<ApplicationFormRow>(
    "SELECT id, title, description, confirmationMessage, isActive, minAge, limitType, limitWindowDays, limitPerForm, maxResponses, theme FROM ApplicationForm WHERE id = ? AND isActive = true",
    [formId]
  );
  return row ?? null;
}

export async function getFormSections(formId: string): Promise<ApplicationFormSectionRow[]> {
  const rows = await query<ApplicationFormSectionRow>(
    "SELECT id, formId, `order`, title, description FROM ApplicationFormSection WHERE formId = ? ORDER BY `order` ASC",
    [formId]
  );
  return rows;
}

export async function getFormFieldsBySection(sectionId: string | null, formId: string): Promise<ApplicationFormFieldRow[]> {
  const cols = "id, formId, sectionId, `order`, type, label, description, required, placeholder, options, validation, autoFill, scaleConfig, fileConfig";
  if (sectionId === null) {
    return query<ApplicationFormFieldRow>(
      `SELECT ${cols} FROM ApplicationFormField WHERE formId = ? AND sectionId IS NULL ORDER BY \`order\` ASC`,
      [formId]
    );
  }
  return query<ApplicationFormFieldRow>(
    `SELECT ${cols} FROM ApplicationFormField WHERE formId = ? AND sectionId = ? ORDER BY \`order\` ASC`,
    [formId, sectionId]
  );
}

export async function getApplicationLimitReset(userId: string, formId: string): Promise<{ resetAt: Date | string } | null> {
  const row = await queryOne<{ resetAt: Date | string }>(
    "SELECT resetAt FROM ApplicationLimitReset WHERE userId = ? AND formId = ?",
    [userId, formId]
  );
  return row ?? null;
}

export async function countSubmissionsByUserFormSince(userId: string, formId: string, since: Date): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM ApplicationSubmission WHERE userId = ? AND formId = ? AND createdAt >= ?",
    [userId, formId, since]
  );
  return Number(row?.n ?? 0);
}

export async function countSubmissionsByUserSince(userId: string, since: Date): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM ApplicationSubmission WHERE userId = ? AND createdAt >= ?",
    [userId, since]
  );
  return Number(row?.n ?? 0);
}

export async function countSubmissionsByForm(formId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM ApplicationSubmission WHERE formId = ?",
    [formId]
  );
  return Number(row?.n ?? 0);
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
}

export async function createSubmission(
  formId: string,
  userId: string,
  username: string | null,
  answers: Record<string, unknown>
): Promise<string> {
  const id = cuid();
  const answersJson = JSON.stringify(answers);
  await execute(
    "INSERT INTO ApplicationSubmission (id, formId, userId, username, status, answers, createdAt) VALUES (?, ?, ?, ?, 'pending', ?, NOW())",
    [id, formId, userId, username, answersJson]
  );
  return id;
}

export async function getFormFieldsByIds(ids: string[], formId: string): Promise<{ id: string; label: string }[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  return query<{ id: string; label: string }>(
    `SELECT id, label FROM ApplicationFormField WHERE id IN (${placeholders}) AND formId = ?`,
    [...ids, formId]
  );
}

export async function listFormsWithSubmissionCount(): Promise<(ApplicationFormRow & { _count: { submissions: number } })[]> {
  const rows = await query<ApplicationFormRow & { submissionCount: number }>(
    `SELECT f.id, f.title, f.description, f.confirmationMessage, f.isActive, f.minAge, f.limitType, f.limitWindowDays, f.limitPerForm, f.maxResponses, f.theme,
            (SELECT COUNT(*) FROM ApplicationSubmission s WHERE s.formId = f.id) as submissionCount
     FROM ApplicationForm f ORDER BY f.updatedAt DESC`,
    []
  );
  return rows.map((r) => {
    const { submissionCount, ...form } = r;
    return { ...form, _count: { submissions: Number(submissionCount) } };
  });
}

export async function createForm(data: { title: string; description?: string | null }): Promise<ApplicationFormRow> {
  const id = cuid();
  await execute(
    `INSERT INTO ApplicationForm (id, title, description, confirmationMessage, isActive, minAge, limitType, limitWindowDays, limitPerForm, maxResponses, createdAt, updatedAt)
     VALUES (?, ?, ?, 'Thank you for your application.', false, NULL, 'PER_FORM', 30, 1, NULL, NOW(), NOW())`,
    [id, data.title.trim(), data.description?.trim() || null]
  );
  const row = await getFormById(id);
  if (!row) throw new Error("Failed to create form");
  return row;
}

export async function updateForm(id: string, data: Partial<{
  title: string;
  description: string | null;
  confirmationMessage: string | null;
  isActive: boolean;
  minAge: number | null;
  limitType: string;
  limitWindowDays: number;
  limitPerForm: number;
  maxResponses: number | null;
  theme: string | null;
}>): Promise<ApplicationFormRow | null> {
  const sets: string[] = ["updatedAt = NOW()"];
  const params: unknown[] = [];
  if (data.title !== undefined) {
    sets.push("title = ?");
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (data.confirmationMessage !== undefined) {
    sets.push("confirmationMessage = ?");
    params.push(data.confirmationMessage);
  }
  if (data.isActive !== undefined) {
    sets.push("isActive = ?");
    params.push(data.isActive);
  }
  if (data.minAge !== undefined) {
    sets.push("minAge = ?");
    params.push(data.minAge);
  }
  if (data.limitType !== undefined) {
    sets.push("limitType = ?");
    params.push(data.limitType);
  }
  if (data.limitWindowDays !== undefined) {
    sets.push("limitWindowDays = ?");
    params.push(data.limitWindowDays);
  }
  if (data.limitPerForm !== undefined) {
    sets.push("limitPerForm = ?");
    params.push(data.limitPerForm);
  }
  if (data.maxResponses !== undefined) {
    sets.push("maxResponses = ?");
    params.push(data.maxResponses);
  }
  if (data.theme !== undefined) {
    sets.push("theme = ?");
    params.push(typeof data.theme === "object" ? JSON.stringify(data.theme) : data.theme);
  }
  params.push(id);
  await execute(`UPDATE ApplicationForm SET ${sets.join(", ")} WHERE id = ?`, params);
  return getFormById(id);
}

export async function deleteForm(id: string): Promise<void> {
  await execute("DELETE FROM ApplicationForm WHERE id = ?", [id]);
}

// Sections
export async function getMaxSectionOrder(formId: string): Promise<number> {
  const row = await queryOne<{ maxOrder: number | null }>(
    "SELECT MAX(`order`) as maxOrder FROM ApplicationFormSection WHERE formId = ?",
    [formId]
  );
  return row?.maxOrder != null ? Number(row.maxOrder) : -1;
}

export async function createSection(formId: string, data: { title?: string; description?: string | null; order?: number }): Promise<ApplicationFormSectionRow> {
  const id = cuid();
  const order = typeof data.order === "number" ? data.order : (await getMaxSectionOrder(formId)) + 1;
  await execute(
    "INSERT INTO ApplicationFormSection (id, formId, `order`, title, description, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",
    [id, formId, order, data.title?.trim() || null, data.description?.trim() || null]
  );
  const row = await queryOne<ApplicationFormSectionRow>("SELECT id, formId, `order`, title, description FROM ApplicationFormSection WHERE id = ?", [id]);
  if (!row) throw new Error("Failed to create section");
  return row;
}

export async function getSectionById(sectionId: string): Promise<ApplicationFormSectionRow | null> {
  const row = await queryOne<ApplicationFormSectionRow>("SELECT id, formId, `order`, title, description FROM ApplicationFormSection WHERE id = ?", [sectionId]);
  return row ?? null;
}

export async function updateSection(sectionId: string, data: { title?: string; description?: string | null; order?: number }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.title !== undefined) {
    sets.push("title = ?");
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (data.order !== undefined) {
    sets.push("`order` = ?");
    params.push(data.order);
  }
  if (params.length === 0) return;
  params.push(sectionId);
  await execute(`UPDATE ApplicationFormSection SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteSection(sectionId: string): Promise<void> {
  await execute("DELETE FROM ApplicationFormSection WHERE id = ?", [sectionId]);
}

// Fields
export async function getMaxFieldOrder(formId: string, sectionId: string | null): Promise<number> {
  const row = sectionId
    ? await queryOne<{ maxOrder: number | null }>("SELECT MAX(`order`) as maxOrder FROM ApplicationFormField WHERE formId = ? AND sectionId = ?", [formId, sectionId])
    : await queryOne<{ maxOrder: number | null }>("SELECT MAX(`order`) as maxOrder FROM ApplicationFormField WHERE formId = ? AND sectionId IS NULL", [formId]);
  return row?.maxOrder != null ? Number(row.maxOrder) : -1;
}

export async function createField(formId: string, data: { sectionId?: string | null; type: string; label: string; description?: string | null; order?: number }): Promise<ApplicationFormFieldRow> {
  const id = cuid();
  const sectionId = data.sectionId ?? null;
  const order = typeof data.order === "number" ? data.order : (await getMaxFieldOrder(formId, sectionId)) + 1;
  await execute(
    `INSERT INTO ApplicationFormField (id, formId, sectionId, \`order\`, type, label, description, required, placeholder, options, validation, autoFill, scaleConfig, fileConfig, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, false, NULL, NULL, NULL, NULL, NULL, NULL, NOW())`,
    [id, formId, sectionId, order, data.type, data.label, data.description?.trim() || null]
  );
  const row = await queryOne<ApplicationFormFieldRow>(`SELECT id, formId, sectionId, \`order\`, type, label, description, required, placeholder, options, validation, autoFill, scaleConfig, fileConfig FROM ApplicationFormField WHERE id = ?`, [id]);
  if (!row) throw new Error("Failed to create field");
  return row;
}

export async function getFieldById(fieldId: string): Promise<ApplicationFormFieldRow | null> {
  const row = await queryOne<ApplicationFormFieldRow>(
    "SELECT id, formId, sectionId, `order`, type, label, description, required, placeholder, options, validation, autoFill, scaleConfig, fileConfig FROM ApplicationFormField WHERE id = ?",
    [fieldId]
  );
  return row ?? null;
}

export async function updateField(fieldId: string, data: Partial<ApplicationFormFieldRow> & { options?: unknown; validation?: unknown; scaleConfig?: unknown; fileConfig?: unknown }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.type !== undefined) {
    sets.push("type = ?");
    params.push(data.type);
  }
  if (data.label !== undefined) {
    sets.push("label = ?");
    params.push(data.label);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (data.required !== undefined) {
    sets.push("required = ?");
    params.push(data.required);
  }
  if (data.placeholder !== undefined) {
    sets.push("placeholder = ?");
    params.push(data.placeholder);
  }
  if (data.order !== undefined) {
    sets.push("`order` = ?");
    params.push(data.order);
  }
  if (data.sectionId !== undefined) {
    sets.push("sectionId = ?");
    params.push(data.sectionId);
  }
  if (data.options !== undefined) {
    sets.push("options = ?");
    params.push(typeof data.options === "string" ? data.options : JSON.stringify(data.options));
  }
  if (data.validation !== undefined) {
    sets.push("validation = ?");
    params.push(typeof data.validation === "string" ? data.validation : (data.validation == null ? null : JSON.stringify(data.validation)));
  }
  if (data.autoFill !== undefined) {
    sets.push("autoFill = ?");
    params.push(data.autoFill);
  }
  if (data.scaleConfig !== undefined) {
    sets.push("scaleConfig = ?");
    params.push(typeof data.scaleConfig === "string" ? data.scaleConfig : (data.scaleConfig == null ? null : JSON.stringify(data.scaleConfig)));
  }
  if (data.fileConfig !== undefined) {
    sets.push("fileConfig = ?");
    params.push(typeof data.fileConfig === "string" ? data.fileConfig : (data.fileConfig == null ? null : JSON.stringify(data.fileConfig)));
  }
  if (params.length === 0) return;
  params.push(fieldId);
  await execute(`UPDATE ApplicationFormField SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteField(fieldId: string): Promise<void> {
  await execute("DELETE FROM ApplicationFormField WHERE id = ?", [fieldId]);
}

// Submissions
export async function listSubmissions(showResolved: boolean): Promise<{ id: string; formId: string; userId: string; username: string | null; status: string; answers: string; createdAt: Date | string; respondedAt: Date | string | null }[]> {
  const where = showResolved ? "" : "WHERE status = 'pending'";
  return query(
    `SELECT id, formId, userId, username, status, answers, createdAt, respondedAt FROM ApplicationSubmission ${where} ORDER BY createdAt DESC`,
    []
  );
}

export async function getSubmissionById(submissionId: string): Promise<{ id: string; formId: string; userId: string; username: string | null; status: string; answers: string; createdAt: Date | string; respondedAt: Date | string | null } | null> {
  const row = await queryOne<{ id: string; formId: string; userId: string; username: string | null; status: string; answers: string; createdAt: Date | string; respondedAt: Date | string | null }>(
    "SELECT id, formId, userId, username, status, answers, createdAt, respondedAt FROM ApplicationSubmission WHERE id = ?",
    [submissionId]
  );
  return row ?? null;
}

export async function updateSubmissionStatus(submissionId: string, status: "accepted" | "rejected"): Promise<void> {
  await execute("UPDATE ApplicationSubmission SET status = ?, respondedAt = NOW() WHERE id = ?", [status, submissionId]);
}

export async function upsertApplicationLimitReset(userId: string, formId: string): Promise<void> {
  await execute(
    "INSERT INTO ApplicationLimitReset (id, userId, formId, resetAt, createdAt) VALUES (?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE resetAt = NOW()",
    [cuid(), userId, formId]
  );
}
