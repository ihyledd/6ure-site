import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { createPage, setPageCategories } from "@/lib/dal/pages";
import { getOrCreateCategoryBySlug } from "@/lib/dal/categories";
import { hasSearchFalseInFrontmatter, slugify } from "@/lib/slugify";
import { PageBuilder } from "@/components/PageBuilder";

export default async function NewPage() {
  const session = await requireAdmin();

  async function createPageAction(formData: FormData) {
    "use server";
    const session = await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const content = String(formData.get("content") ?? "");
    const slugInput = String(formData.get("slug") ?? "").trim();
    const published = formData.get("published") === "on";
    const featured = formData.get("featured") === "on";
    const hidden = formData.get("hidden") === "on";
    const excludeFromSearch = formData.get("exclude_from_search") === "on";
    const searchable = !excludeFromSearch && !hasSearchFalseInFrontmatter(content);
    const pagePassword = String(formData.get("page_password") ?? "").trim() || null;
    const categoriesRaw = String(formData.get("categories") ?? "");

    if (!title) return;

    const slug = slugify(slugInput || title);
    const categoryNames = categoriesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const categoryIds: string[] = [];
    for (const name of categoryNames) {
      const cSlug = slugify(name);
      if (!cSlug) continue;
      const id = await getOrCreateCategoryBySlug(cSlug, name);
      categoryIds.push(id);
    }

    const pageId = await createPage({
      title,
      description,
      slug,
      content,
      published,
      searchable,
      featured,
      hidden,
      password: pagePassword,
      createdById: session.user.id,
    });
    await setPageCategories(pageId, categoryIds);

    redirect(`/wiki/p/${slug}`);
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>New page</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Signed in as {session.user.name ?? session.user.id}
        </p>
      </header>
      <form action={createPageAction} className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "none" }}>
        <div className="dashboard-form-group">
          <label>Title</label>
          <input name="title" required />
        </div>
        <div className="dashboard-form-group">
          <label>Description</label>
          <input name="description" placeholder="A short summary..." maxLength={200} />
        </div>
        <div className="dashboard-form-group">
          <label>Slug (optional)</label>
          <input name="slug" placeholder="my-page" />
        </div>
        <div className="dashboard-form-group">
          <label>Categories (comma-separated)</label>
          <input name="categories" placeholder="guides, troubleshooting" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="published" defaultChecked />
          Published
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="featured" />
          Featured
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="hidden" />
          Hidden
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="exclude_from_search" />
          Exclude from search
        </label>
        <div className="dashboard-form-group">
          <label>Password lock</label>
          <input name="page_password" type="text" />
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "block", color: "var(--text-secondary)" }}>Content (Markdown)</span>
          <PageBuilder name="content" defaultValue={`# ${new Date().getFullYear()} Notes\n\nStart writing...`} />
        </div>
        <button type="submit" className="dashboard-btn dashboard-btn-primary">Create page</button>
      </form>
    </div>
  );
}
