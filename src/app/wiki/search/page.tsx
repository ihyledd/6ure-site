import Link from "next/link";

import { searchPagesBrief } from "@/lib/dal/pages";
import { WikiSuggestChangesCard } from "@/components/WikiSuggestChangesCard";

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const pages =
    q.length > 0 ? await searchPagesBrief(q, 50) : [];

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <div style={{ marginBottom: 48 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          <Link href="/">Home</Link> / <span style={{ color: "var(--text-primary)" }}>Search</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Search</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Use the search box in the header.
        </p>
      </header>

      {q.length > 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
          Results for <strong style={{ color: "var(--text-primary)" }}>{q}</strong>
        </p>
      )}

      {q.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Enter a query to search pages.</p>
      ) : pages.length ? (
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
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No results.</p>
      )}

      <WikiSuggestChangesCard />
    </div>
  );
}
