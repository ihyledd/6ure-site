import { queryOne, query, execute } from "@/lib/db";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hidden: boolean;
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const row = await queryOne<CategoryRow>(
    "SELECT id, slug, name, description, hidden FROM Category WHERE slug = ?",
    [slug]
  );
  return row ?? null;
}

export async function getCategoryById(id: string): Promise<CategoryRow | null> {
  const row = await queryOne<CategoryRow>(
    "SELECT id, slug, name, description, hidden FROM Category WHERE id = ?",
    [id]
  );
  return row ?? null;
}

export async function getAllCategories(): Promise<CategoryRow[]> {
  return query<CategoryRow>("SELECT id, slug, name, description, hidden FROM Category ORDER BY name ASC", []);
}

export async function createCategory(data: { slug: string; name: string; description?: string | null }): Promise<string> {
  const id = cuid();
  await execute(
    "INSERT INTO Category (id, slug, name, description, hidden) VALUES (?, ?, ?, ?, false)",
    [id, data.slug, data.name, data.description ?? null]
  );
  return id;
}

export async function updateCategory(id: string, data: { slug?: string; name?: string; description?: string | null; hidden?: boolean }): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.slug !== undefined) {
    sets.push("slug = ?");
    params.push(data.slug);
  }
  if (data.name !== undefined) {
    sets.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (data.hidden !== undefined) {
    sets.push("hidden = ?");
    params.push(data.hidden);
  }
  if (sets.length === 0) return;
  params.push(id);
  await execute(`UPDATE Category SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function getOrCreateCategoryBySlug(slug: string, name: string, description?: string | null): Promise<string> {
  const existing = await getCategoryBySlug(slug);
  if (existing) {
    await updateCategory(existing.id, { name, description: description ?? undefined });
    return existing.id;
  }
  return createCategory({ slug, name, description });
}

export async function deleteCategory(id: string): Promise<void> {
  await execute("DELETE FROM Category WHERE id = ?", [id]);
}

export async function getPagesByCategorySlug(slug: string): Promise<{ id: string; slug: string; title: string; updatedAt: Date | string }[]> {
  return query<{ id: string; slug: string; title: string; updatedAt: Date | string }>(
    `SELECT p.id, p.slug, p.title, p.updatedAt FROM Page p
     INNER JOIN PageCategory pc ON pc.pageId = p.id
     INNER JOIN Category c ON c.id = pc.categoryId AND c.slug = ?
     WHERE p.published = true
     ORDER BY p.updatedAt DESC`,
    [slug]
  );
}
