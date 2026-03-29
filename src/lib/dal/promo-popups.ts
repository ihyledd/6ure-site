import { query, queryOne, execute } from "@/lib/db";

export type PromoPopupRow = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  features: string[];
  ctaText: string | null;
  ctaUrl: string | null;
  active: boolean;
  createdAt: Date | string;
};

type DbRow = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  features: string | null;
  cta_text: string | null;
  cta_url: string | null;
  active: number;
  created_at: Date | string;
};

function parseFeatures(json: string | null): string[] {
  if (!json || !json.trim()) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function getActivePromoPopup(): Promise<PromoPopupRow | null> {
  const row = await queryOne<DbRow>(
    "SELECT id, title, description, image_url, features, cta_text, cta_url, active, created_at FROM promo_popups WHERE active = 1 ORDER BY updated_at DESC LIMIT 1",
    []
  );
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    features: parseFeatures(row.features),
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export async function getAllPromoPopups(): Promise<PromoPopupRow[]> {
  const rows = await query<DbRow>(
    "SELECT id, title, description, image_url, features, cta_text, cta_url, active, created_at FROM promo_popups ORDER BY updated_at DESC",
    []
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    features: parseFeatures(row.features),
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    active: Boolean(row.active),
    createdAt: row.created_at,
  }));
}

export async function createPromoPopup(params: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  features?: string[];
  ctaText?: string | null;
  ctaUrl?: string | null;
  active?: boolean;
}): Promise<number> {
  const featuresJson = JSON.stringify(params.features ?? []);
  const result = await execute(
    "INSERT INTO promo_popups (title, description, image_url, features, cta_text, cta_url, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      params.title,
      params.description ?? null,
      params.imageUrl ?? null,
      featuresJson,
      params.ctaText ?? null,
      params.ctaUrl ?? null,
      params.active ? 1 : 0,
    ]
  );
  return result.insertId ?? 0;
}

export async function updatePromoPopup(
  id: number,
  params: {
    title?: string;
    description?: string | null;
    imageUrl?: string | null;
    features?: string[];
    ctaText?: string | null;
    ctaUrl?: string | null;
    active?: boolean;
  }
): Promise<boolean> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (params.title !== undefined) {
    updates.push("title = ?");
    values.push(params.title);
  }
  if (params.description !== undefined) {
    updates.push("description = ?");
    values.push(params.description);
  }
  if (params.imageUrl !== undefined) {
    updates.push("image_url = ?");
    values.push(params.imageUrl);
  }
  if (params.features !== undefined) {
    updates.push("features = ?");
    values.push(JSON.stringify(params.features));
  }
  if (params.ctaText !== undefined) {
    updates.push("cta_text = ?");
    values.push(params.ctaText);
  }
  if (params.ctaUrl !== undefined) {
    updates.push("cta_url = ?");
    values.push(params.ctaUrl);
  }
  if (params.active !== undefined) {
    updates.push("active = ?");
    values.push(params.active ? 1 : 0);
  }
  if (updates.length === 0) return false;
  values.push(id);
  const result = await execute(
    `UPDATE promo_popups SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
    values
  );
  return (result.affectedRows ?? 0) > 0;
}

export async function deletePromoPopup(id: number): Promise<boolean> {
  const result = await execute("DELETE FROM promo_popups WHERE id = ?", [id]);
  return (result.affectedRows ?? 0) > 0;
}
