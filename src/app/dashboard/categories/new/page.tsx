import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { createCategory } from "@/lib/dal/categories";
import { slugify } from "@/lib/slugify";

export default async function NewCategory() {
  await requireAdmin();

  async function createAction(formData: FormData) {
    "use server";
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) return;
    const slug = slugify(name);
    await createCategory({ slug, name, description: description || null });
    redirect("/dashboard/categories");
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="dashboard-section-header">
        <h2>Add category</h2>
        <p>
          <Link href="/dashboard/categories" style={{ color: "var(--discord-blurple)" }}>Categories</Link> / New
        </p>
      </div>

      <form action={createAction} className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
        <div className="dashboard-form-group">
          <label>Name</label>
          <input name="name" required placeholder="e.g. Guides" />
        </div>
        <div className="dashboard-form-group">
          <label>Description (optional)</label>
          <textarea name="description" rows={2} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="dashboard-btn dashboard-btn-primary">Create</button>
          <Link href="/dashboard/categories" className="dashboard-btn dashboard-btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
