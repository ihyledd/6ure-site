import Link from "next/link";
import { getAllCategories } from "@/lib/dal/categories";

export const dynamic = "force-dynamic";

export default async function DashboardCategoriesPage() {
  const categories = await getAllCategories();

  return (
    <div className="dashboard-content-block">
      <h1 className="dashboard-title">Categories</h1>
      <p className="dashboard-description">Wiki categories for grouping pages.</p>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/categories/new" className="dashboard-btn dashboard-btn-primary">
          New category
        </Link>
      </div>
      {categories.length === 0 ? (
        <p className="dashboard-empty">No categories yet.</p>
      ) : (
        <ul className="dashboard-list-plain">
          {categories.map((c) => (
            <li key={c.id} className="dashboard-list-item dashboard-list-item-compact">
              <Link href={`/admin/categories/${c.id}/edit`} style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                {c.name}
              </Link>
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>({c.slug})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
