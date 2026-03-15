import { query, queryOne, execute } from "@/lib/db";

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  published: boolean;
  searchable: boolean;
  featured: boolean;
  hidden: boolean;
  viewCount: number;
  password: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export async function getPageBySlug(slug: string): Promise<PageRow | null> {
  const row = await queryOne<PageRow>(
    "SELECT id, slug, title, description, content, published, searchable, featured, hidden, viewCount, password, createdAt, updatedAt FROM Page WHERE slug = ?",
    [slug]
  );
  return row ?? null;
}

export async function getPageById(id: string): Promise<{ id: string; slug: string } | null> {
  const row = await queryOne<{ id: string; slug: string }>("SELECT id, slug FROM Page WHERE id = ?", [id]);
  return row ?? null;
}

export async function getPageByIdFull(id: string): Promise<PageRow | null> {
  const row = await queryOne<PageRow>(
    "SELECT id, slug, title, description, content, published, searchable, featured, hidden, viewCount, password, createdAt, updatedAt FROM Page WHERE id = ?",
    [id]
  );
  return row ?? null;
}

export async function getPageIdViewCountBySlug(slug: string): Promise<{ id: string; viewCount: number } | null> {
  const row = await queryOne<{ id: string; viewCount: number }>(
    "SELECT id, viewCount FROM Page WHERE slug = ? AND published = true",
    [slug]
  );
  return row ?? null;
}

export async function getPageViewCountAfterIncrement(id: string): Promise<number> {
  const row = await queryOne<{ viewCount: number }>("SELECT viewCount FROM Page WHERE id = ?", [id]);
  return Number(row?.viewCount ?? 0);
}

export async function getPagesForAdmin(limit: number): Promise<{ id: string; slug: string; title: string; published: boolean; updatedAt: Date | string }[]> {
  const limitNum = Math.max(1, Math.min(1000, Number(limit) || 50));
  return query<{ id: string; slug: string; title: string; published: boolean; updatedAt: Date | string }>(
    `SELECT id, slug, title, published, updatedAt FROM Page ORDER BY updatedAt DESC LIMIT ${limitNum}`,
    []
  );
}

function pageCuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
}

export async function createPage(data: {
  slug: string;
  title: string;
  description?: string | null;
  content: string;
  published?: boolean;
  searchable?: boolean;
  featured?: boolean;
  hidden?: boolean;
  password?: string | null;
  createdById?: string | null;
}): Promise<string> {
  const id = pageCuid();
  await execute(
    `INSERT INTO Page (id, slug, title, description, content, published, searchable, featured, hidden, password, viewCount, createdById, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
    [
      id,
      data.slug,
      data.title,
      data.description ?? null,
      data.content,
      data.published ?? true,
      data.searchable ?? true,
      data.featured ?? false,
      data.hidden ?? false,
      data.password ?? null,
      data.createdById ?? null,
    ]
  );
  return id;
}

export async function updatePage(
  id: string,
  data: Partial<{
    slug: string;
    title: string;
    description: string | null;
    content: string;
    published: boolean;
    searchable: boolean;
    featured: boolean;
    hidden: boolean;
    password: string | null;
  }>
): Promise<void> {
  const sets: string[] = ["updatedAt = NOW()"];
  const params: unknown[] = [];
  if (data.slug !== undefined) {
    sets.push("slug = ?");
    params.push(data.slug);
  }
  if (data.title !== undefined) {
    sets.push("title = ?");
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (data.content !== undefined) {
    sets.push("content = ?");
    params.push(data.content);
  }
  if (data.published !== undefined) {
    sets.push("published = ?");
    params.push(data.published);
  }
  if (data.searchable !== undefined) {
    sets.push("searchable = ?");
    params.push(data.searchable);
  }
  if (data.featured !== undefined) {
    sets.push("featured = ?");
    params.push(data.featured);
  }
  if (data.hidden !== undefined) {
    sets.push("hidden = ?");
    params.push(data.hidden);
  }
  if (data.password !== undefined) {
    sets.push("password = ?");
    params.push(data.password);
  }
  if (params.length === 0) return;
  params.push(id);
  await execute(`UPDATE Page SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deletePage(id: string): Promise<void> {
  await execute("DELETE FROM PageCategory WHERE pageId = ?", [id]);
  await execute("DELETE FROM Page WHERE id = ?", [id]);
}

export async function setPageCategories(pageId: string, categoryIds: string[]): Promise<void> {
  await execute("DELETE FROM PageCategory WHERE pageId = ?", [pageId]);
  for (const categoryId of categoryIds) {
    await execute("INSERT INTO PageCategory (pageId, categoryId) VALUES (?, ?)", [pageId, categoryId]);
  }
}

export async function bulkDeletePages(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  await execute(`DELETE FROM PageCategory WHERE pageId IN (${placeholders})`, ids);
  await execute(`DELETE FROM Page WHERE id IN (${placeholders})`, ids);
}

export async function bulkUpdatePages(
  ids: string[],
  data: { featured?: boolean; hidden?: boolean; published?: boolean }
): Promise<void> {
  if (ids.length === 0) return;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.featured !== undefined) {
    sets.push("featured = ?");
    params.push(data.featured);
  }
  if (data.hidden !== undefined) {
    sets.push("hidden = ?");
    params.push(data.hidden);
  }
  if (data.published !== undefined) {
    sets.push("published = ?");
    params.push(data.published);
  }
  if (sets.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  await execute(`UPDATE Page SET ${sets.join(", ")}, updatedAt = NOW() WHERE id IN (${placeholders})`, [...params, ...ids]);
}

export async function getPublishedPagesForSitemap(): Promise<{ slug: string; updatedAt: Date | string }[]> {
  return query<{ slug: string; updatedAt: Date | string }>(
    "SELECT slug, updatedAt FROM Page WHERE published = true AND hidden = false",
    []
  );
}

export async function getCategoriesForSitemap(): Promise<{ slug: string }[]> {
  return query<{ slug: string }>("SELECT slug FROM Category WHERE hidden = false", []);
}

export async function incrementPageViewCount(id: string): Promise<void> {
  await execute("UPDATE Page SET viewCount = viewCount + 1 WHERE id = ?", [id]);
}

export async function searchPages(q: string, limit: number): Promise<
  { slug: string; title: string; content: string; categoryNames: string }[]
> {
  const term = `%${q}%`;
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
  const rows = await query<{ slug: string; title: string; content: string; categoryNames: string | null }>(
    `SELECT p.slug, p.title, p.content,
            (SELECT GROUP_CONCAT(c.name) FROM PageCategory pc JOIN Category c ON c.id = pc.categoryId WHERE pc.pageId = p.id) as categoryNames
     FROM Page p
     WHERE p.published = true AND p.searchable = true AND (p.title LIKE ? OR p.content LIKE ?)
     ORDER BY p.updatedAt DESC
     LIMIT ${limitNum}`,
    [term, term]
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    content: r.content,
    categoryNames: r.categoryNames ?? "",
  }));
}

export async function searchPagesBrief(q: string, limit: number): Promise<{ id: string; slug: string; title: string; updatedAt: Date | string }[]> {
  const term = `%${q}%`;
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
  return query<{ id: string; slug: string; title: string; updatedAt: Date | string }>(
    `SELECT id, slug, title, updatedAt FROM Page WHERE published = true AND (title LIKE ? OR content LIKE ?) ORDER BY updatedAt DESC LIMIT ${limitNum}`,
    [term, term]
  );
}

export async function getCategoryIdsByPageId(pageId: string): Promise<string[]> {
  const rows = await query<{ categoryId: string }>(
    "SELECT categoryId FROM PageCategory WHERE pageId = ?",
    [pageId]
  );
  return rows.map((r) => r.categoryId);
}

export interface PageCategoryInfo {
  categoryId: string;
  slug: string;
  name: string;
}

export async function getPageCategories(pageId: string): Promise<PageCategoryInfo[]> {
  return query<PageCategoryInfo>(
    "SELECT pc.categoryId as categoryId, c.slug as slug, c.name as name FROM PageCategory pc JOIN Category c ON c.id = pc.categoryId WHERE pc.pageId = ?",
    [pageId]
  );
}

export async function getRelatedPages(slug: string, categoryIds: string[], limit: number): Promise<{ slug: string; title: string; categoryName: string | null }[]> {
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => "?").join(", ");
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  return query<{ slug: string; title: string; category_name: string | null }>(
    `SELECT p.slug, p.title,
            (SELECT c.name FROM PageCategory pc2 JOIN Category c ON c.id = pc2.categoryId WHERE pc2.pageId = p.id LIMIT 1) as category_name
     FROM Page p
     INNER JOIN PageCategory pc ON pc.pageId = p.id AND pc.categoryId IN (${placeholders})
     WHERE p.published = true AND p.hidden = false AND p.slug != ?
     ORDER BY p.updatedAt DESC LIMIT ${limitNum}`,
    [...categoryIds, slug]
  ).then((rows) => rows.map((r) => ({ slug: r.slug, title: r.title, categoryName: r.category_name })));
}
