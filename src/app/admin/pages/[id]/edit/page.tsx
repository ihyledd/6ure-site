import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { getPageByIdFull, getPageCategories, updatePage, setPageCategories } from "@/lib/dal/pages";
import { getOrCreateCategoryBySlug } from "@/lib/dal/categories";
import { hasSearchFalseInFrontmatter, slugify } from "@/lib/slugify";
import { deletePageAction } from "../delete/action";
import { PageBuilder } from "@/components/PageBuilder";
import { DeletePageForm } from "@/components/DeletePageForm";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const page = await getPageByIdFull(id);
  if (!page) notFound();

  const categories = await getPageCategories(id);
  const categoriesInitial = categories.map((c) => c.name).join(", ");

  async function updatePageAction(formData: FormData) {
    "use server";
    await requireAdmin();

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

    if (!title) {
      redirect(`/admin/pages/${id}/edit?error=title_required`);
      return;
    }

    const slug = slugify(slugInput || title);
    const categoryNames = categoriesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const categoryIds: string[] = [];
    for (const name of categoryNames) {
      const cSlug = slugify(name);
      if (!cSlug) continue;
      const cid = await getOrCreateCategoryBySlug(cSlug, name);
      categoryIds.push(cid);
    }

    try {
      await updatePage(id, {
        title,
        description,
        slug,
        content,
        published,
        searchable,
        featured,
        hidden,
        password: pagePassword,
      });
      await setPageCategories(id, categoryIds);
    } catch {
      redirect(`/admin/pages/${id}/edit?error=save_failed`);
      return;
    }

    redirect(`/wiki/p/${slug}`);
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Edit page</h2>
        <p>
          <Link href="/admin" style={{ color: "var(--discord-blurple)" }}>Pages</Link> / Edit
        </p>
      </div>

      {errorParam && (
        <div
          className="dashboard-toast dashboard-toast-error"
          style={{ marginBottom: 16 }}
          role="alert"
        >
          {errorParam === "title_required"
            ? "Title is required."
            : errorParam === "save_failed"
              ? "Could not save. Please try again."
              : "Something went wrong."}
        </div>
      )}
      <form action={updatePageAction} className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "none" }}>
        <div className="dashboard-form-group">
          <label>Title</label>
          <input name="title" required defaultValue={page.title} />
        </div>
        <div className="dashboard-form-group">
          <label>Description <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(shown on cards)</span></label>
          <input name="description" defaultValue={page.description ?? ""} placeholder="A short summary of this page..." maxLength={200} />
        </div>
        <div className="dashboard-form-group">
          <label>Slug</label>
          <input name="slug" required defaultValue={page.slug} />
        </div>
        <div className="dashboard-form-group">
          <label>Categories (comma-separated)</label>
          <input name="categories" defaultValue={categoriesInitial} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="published" defaultChecked={page.published} />
          Published
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="featured" defaultChecked={page.featured} />
          Featured (show on home)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="hidden" defaultChecked={page.hidden} />
          Hidden from home page
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }} title="Or add search: false in markdown frontmatter">
          <input type="checkbox" name="exclude_from_search" defaultChecked={!page.searchable} />
          Exclude from search
        </label>
        <div className="dashboard-form-group">
          <label>Password lock <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(leave empty to remove lock)</span></label>
          <input name="page_password" type="text" defaultValue={page.password ?? ""} placeholder="Enter a password to lock this page" style={{ maxWidth: 360 }} />
        </div>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "block", color: "var(--text-secondary)" }}>Content (Markdown)</span>
          <PageBuilder name="content" defaultValue={page.content} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="submit" className="dashboard-btn dashboard-btn-primary">
            Save changes
          </button>
        </div>
      </form>
      <DeletePageForm pageId={page.id} deleteAction={deletePageAction} />
    </div>
  );
}
