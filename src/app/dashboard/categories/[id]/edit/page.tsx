import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { getCategoryById, updateCategory } from "@/lib/dal/categories";
import { slugify } from "@/lib/slugify";

type Props = { params: Promise<{ id: string }> };

export default async function EditCategory({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const hidden = formData.get("hidden") === "on";
    if (!name) return;
    const slug = slugify(name);
    await updateCategory(id, { slug, name, description: description || null, hidden });
    redirect("/dashboard/categories");
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Edit category</h2>
        <p>
          <Link href="/dashboard/categories" style={{ color: "var(--discord-blurple)" }}>Categories</Link> / Edit
        </p>
      </div>

      <form action={updateAction} className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
        <div className="dashboard-form-group">
          <label>Name</label>
          <input name="name" required defaultValue={category.name} />
        </div>
        <div className="dashboard-form-group">
          <label>Description (optional)</label>
          <textarea name="description" rows={2} defaultValue={category.description ?? ""} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)" }}>
          <input type="checkbox" name="hidden" defaultChecked={category.hidden} />
          Hidden from home page
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="dashboard-btn dashboard-btn-primary">Save</button>
          <Link href="/dashboard/categories" className="dashboard-btn dashboard-btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
