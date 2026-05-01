import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { requireAdmin } from "@/lib/require-admin";
import { getPageBySlug, createPage, updatePage, setPageCategories } from "@/lib/dal/pages";
import { getOrCreateCategoryBySlug } from "@/lib/dal/categories";
import { slugify } from "@/lib/slugify";
import { hasSearchFalseInFrontmatter } from "@/lib/slugify";

const CONTENT_DIR = path.join(process.cwd(), "content", "6ure-wiki");

const IMPORT_MAP: { path: string; category: string; slug?: string; title?: string }[] = [
  { path: "faq/general.md", category: "Frequently Asked Questions", slug: "faq-general", title: "General Questions" },
  { path: "resources/windows.md", category: "Resources", slug: "resources-windows", title: "Windows" },
  { path: "resources/macos.md", category: "Resources", slug: "resources-macos", title: "MacOS" },
  { path: "resources/extras.md", category: "Resources", slug: "resources-extras", title: "Extras" },
  { path: "beginners.md", category: "Guides", slug: "beginners", title: "Beginners Guide" },
  { path: "guide/community-support.md", category: "Guides", slug: "guide-community-support", title: "Community & Support" },
  { path: "guide/faq.md", category: "Guides", slug: "guide-faq", title: "FAQ" },
  { path: "guide/moderator.md", category: "Guides", slug: "guide-moderator", title: "Moderator" },
  { path: "guide/partner-manager.md", category: "Guides", slug: "guide-partner-manager", title: "Partner Manager" },
  { path: "guide/predefined-reasons.md", category: "Guides", slug: "guide-predefined-reasons", title: "Predefined Reasons" },
  { path: "resource.md", category: "Resources", slug: "resource", title: "Resource" },
  { path: "websites.md", category: "Other", slug: "websites", title: "Websites" },
];

function extractTitleFromMarkdown(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return "Untitled";
}

function readLocalContent(filePath: string): string | null {
  const fullPath = path.join(CONTENT_DIR, filePath);
  try {
    return fs.readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created: string[] = [];
  const updated: string[] = [];
  const errors: { path: string; error: string }[] = [];

  for (const item of IMPORT_MAP) {
    try {
      const content = readLocalContent(item.path);
      if (content == null) {
        errors.push({ path: item.path, error: "File not found in content/6ure-wiki/. Run: node scripts/copy-6ure-wiki.mjs" });
        continue;
      }
      const title = item.title ?? extractTitleFromMarkdown(content);
      const slug = item.slug ?? slugify(title);
      const searchable = !hasSearchFalseInFrontmatter(content);

      const categoryId = await getOrCreateCategoryBySlug(slugify(item.category), item.category);

      const existing = await getPageBySlug(slug);

      if (existing) {
        await updatePage(existing.id, { title, content, searchable, published: true });
        await setPageCategories(existing.id, [categoryId]);
        updated.push(slug);
      } else {
        const pageId = await createPage({
          slug,
          title,
          content,
          published: true,
          searchable,
        });
        await setPageCategories(pageId, [categoryId]);
        created.push(slug);
      }
    } catch (e) {
      errors.push({ path: item.path, error: String(e) });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    created,
    updated,
    errors,
  });
}
