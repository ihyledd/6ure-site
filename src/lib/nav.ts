import { query } from "@/lib/db";

const SIDEBAR_ORDER = [
  "Resources",
  "Frequently Asked Questions",
  "Guides",
  "Other",
  "Information",
];

export type NavCategory = {
  id: string;
  name: string;
  slug: string;
  pages: { slug: string; title: string }[];
};

export async function getSidebarNav(): Promise<NavCategory[]> {
  const rows = await query<{ id: string; name: string; slug: string; page_slug: string; page_title: string }>(
    `SELECT c.id, c.name, c.slug, p.slug as page_slug, p.title as page_title
     FROM Category c
     INNER JOIN PageCategory pc ON pc.categoryId = c.id
     INNER JOIN Page p ON p.id = pc.pageId AND p.published = true
     ORDER BY c.name ASC, p.updatedAt DESC`
  );

  const byCategory = new Map<string, { id: string; name: string; slug: string; pages: { slug: string; title: string }[] }>();
  for (const r of rows) {
    if (!byCategory.has(r.id)) {
      byCategory.set(r.id, { id: r.id, name: r.name, slug: r.slug, pages: [] });
    }
    const cat = byCategory.get(r.id)!;
    cat.pages.push({ slug: r.page_slug, title: r.page_title });
  }
  const withPages = Array.from(byCategory.values());
  const orderMap = new Map(SIDEBAR_ORDER.map((name, i) => [name.toLowerCase(), i]));
  return withPages.sort((a, b) => {
    const ai = orderMap.get(a.name.toLowerCase()) ?? 999;
    const bi = orderMap.get(b.name.toLowerCase()) ?? 999;
    return ai - bi;
  });
}
