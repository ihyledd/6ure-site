import { query, execute } from "@/lib/db";

export type FaqRow = {
  id: number;
  question: string;
  answer: string;
  order_index: number;
  category: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export async function getFaqsList(params?: { category?: string | null }): Promise<FaqRow[]> {
  let sql = "SELECT id, question, answer, order_index, category, created_at, updated_at FROM faqs";
  const sqlParams: unknown[] = [];
  if (params?.category && (params.category === "general" || params.category === "membership")) {
    sql += " WHERE category = ?";
    sqlParams.push(params.category);
  }
  sql += " ORDER BY order_index ASC, id ASC";

  const rows = await query<{
    id: number;
    question: string;
    answer: string;
    order_index: number;
    category: string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }>(sql, sqlParams);
  return rows.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    order_index: f.order_index,
    category: f.category,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));
}

export async function createFaq(params: {
  question: string;
  answer: string;
  category?: string | null;
  order_index?: number;
}): Promise<number> {
  const category = params.category && (params.category === "general" || params.category === "membership")
    ? params.category
    : "general";
  const orderIndex = params.order_index ?? 0;
  const result = await execute(
    "INSERT INTO faqs (question, answer, category, order_index) VALUES (?, ?, ?, ?)",
    [params.question, params.answer, category, orderIndex]
  );
  return result.insertId ?? 0;
}

export async function updateFaq(
  id: number,
  params: {
    question?: string;
    answer?: string;
    category?: string | null;
    order_index?: number;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (params.question !== undefined) {
    updates.push("question = ?");
    values.push(params.question);
  }
  if (params.answer !== undefined) {
    updates.push("answer = ?");
    values.push(params.answer);
  }
  if (params.category !== undefined) {
    updates.push("category = ?");
    values.push(
      params.category && (params.category === "general" || params.category === "membership")
        ? params.category
        : "general"
    );
  }
  if (params.order_index !== undefined) {
    updates.push("order_index = ?");
    values.push(params.order_index);
  }
  if (updates.length === 0) return false;
  values.push(id);
  const result = await execute(
    `UPDATE faqs SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return (result.affectedRows ?? 0) > 0;
}

export async function deleteFaq(id: number): Promise<boolean> {
  const result = await execute("DELETE FROM faqs WHERE id = ?", [id]);
  return (result.affectedRows ?? 0) > 0;
}
