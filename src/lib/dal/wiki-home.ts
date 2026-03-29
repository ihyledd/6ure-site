import { query, queryOne, execute } from "@/lib/db";

export interface ManualUpdateRow {
  id: string;
  title: string;
  body: string | null;
  createdAt: Date | string;
}

export async function getManualUpdates(limit: number): Promise<ManualUpdateRow[]> {
  const limitNum = Math.max(1, Math.min(1000, Number(limit) || 10));
  return query<ManualUpdateRow>(
    `SELECT id, title, body, createdAt FROM ManualUpdate ORDER BY createdAt DESC LIMIT ${limitNum}`,
    []
  );
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
}

export async function createManualUpdate(data: { title: string; body?: string | null }): Promise<string> {
  const id = cuid();
  await execute(
    "INSERT INTO ManualUpdate (id, title, body, createdAt) VALUES (?, ?, ?, NOW())",
    [id, data.title, data.body ?? null]
  );
  return id;
}

export async function deleteManualUpdate(id: string): Promise<void> {
  await execute("DELETE FROM ManualUpdate WHERE id = ?", [id]);
}

export interface PageRowWithCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  viewCount: number;
  updatedAt: Date | string;
  category_slug: string | null;
  category_name: string | null;
}

export async function getWikiPagesWithCategory(
  options: { featured?: boolean; limit: number }
): Promise<PageRowWithCategory[]> {
  const where = "p.published = true AND p.hidden = false" + (options.featured ? " AND p.featured = true" : "");
  const limitNum = Math.max(1, Math.min(500, Number(options.limit) || 20));
  const rows = await query<PageRowWithCategory>(
    `SELECT p.id, p.slug, p.title, p.description, p.viewCount, p.updatedAt,
            (SELECT c.slug FROM PageCategory pc JOIN Category c ON c.id = pc.categoryId WHERE pc.pageId = p.id LIMIT 1) as category_slug,
            (SELECT c.name FROM PageCategory pc JOIN Category c ON c.id = pc.categoryId WHERE pc.pageId = p.id LIMIT 1) as category_name
     FROM Page p
     WHERE ${where}
     ORDER BY p.updatedAt DESC
     LIMIT ${limitNum}`,
    []
  );
  return rows;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  pageCount: number;
}

export async function getWikiCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const rows = await query<{ id: string; name: string; slug: string; pageCount: number }>(
    `SELECT c.id, c.name, c.slug,
            (SELECT COUNT(*) FROM PageCategory pc JOIN Page p ON p.id = pc.pageId WHERE pc.categoryId = c.id AND p.published = true AND p.hidden = false) as pageCount
     FROM Category c
     WHERE c.hidden = false
     ORDER BY c.name ASC`,
    []
  );
  return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, pageCount: Number(r.pageCount) }));
}

export async function getWikiPageCount(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) as n FROM Page WHERE published = true AND hidden = false",
    []
  );
  return Number(row?.n ?? 0);
}

export async function getWikiTotalViews(): Promise<number> {
  const row = await queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(viewCount), 0) as total FROM Page WHERE published = true",
    []
  );
  return Number(row?.total ?? 0);
}
