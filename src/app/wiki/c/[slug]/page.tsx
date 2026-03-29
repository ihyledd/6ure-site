import Link from "next/link";
import { notFound } from "next/navigation";

import { getCategoryBySlug, getPagesByCategorySlug } from "@/lib/dal/categories";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const pages = await getPagesByCategorySlug(slug);

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <div style={{ marginBottom: 48 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          <Link href="/">Home</Link> /{" "}
          <span style={{ color: "var(--text-primary)" }}>Category</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{category.name}</h1>
        {category.description ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{category.description}</p>
        ) : null}
      </header>

      {pages.length ? (
        <div className="wiki-card">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {pages.map((p) => (
              <li key={p.id} className="wiki-list-card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Link href={`/wiki/p/${p.slug}`} style={{ fontWeight: 600 }}>
                    {p.title}
                  </Link>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {new Intl.DateTimeFormat(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    }).format(toDate(p.updatedAt))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No pages in this category.</p>
      )}
    </div>
  );
}
