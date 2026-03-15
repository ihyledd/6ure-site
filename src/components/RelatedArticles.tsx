import Link from "next/link";

type RelatedItem = {
  slug: string;
  title: string;
  categories: { category: { name: string } }[];
};

export function RelatedArticles({ related }: { related: RelatedItem[] }) {
  if (related.length === 0) return null;
  return (
    <aside className="wiki-related">
      <h3 className="wiki-related-title">Related articles</h3>
      <ul className="wiki-related-list">
        {related.map((p) => (
          <li key={p.slug}>
            <Link href={`/wiki/p/${p.slug}`} className="wiki-related-link">
              {p.title}
              {p.categories[0] && (
                <span className="wiki-related-cat">{p.categories[0].category.name}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
