import Link from "next/link";

import {
  getManualUpdates,
  getWikiCategoriesWithCount,
  getWikiPagesWithCategory,
  getWikiPageCount,
  getWikiTotalViews,
} from "@/lib/dal/wiki-home";
import { WikiSearchHint } from "@/components/WikiSearchHint";
import { RecentUpdatesCard } from "@/components/RecentUpdatesCard";
import { WikiSuggestChangesCard } from "@/components/WikiSuggestChangesCard";

const FEATURED_COUNT = 6;
const RECENT_UPDATES_COUNT = 8;

async function getRecentUpdates() {
  const [manual, pageUpdates] = await Promise.all([
    getManualUpdates(10),
    getWikiPagesWithCategory({ limit: 10 }),
  ]);
  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);
  const manualEntries = manual.map((m) => ({
    type: "manual" as const,
    id: m.id,
    title: m.title,
    body: m.body,
    date: toDate(m.createdAt),
    slug: null as string | null,
  }));
  const autoEntries = pageUpdates.map((p) => ({
    type: "auto" as const,
    id: p.slug,
    title: p.title,
    body: null as string | null,
    date: toDate(p.updatedAt),
    slug: p.slug,
  }));
  const merged = [...manualEntries, ...autoEntries]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_UPDATES_COUNT);
  return merged;
}

export default async function Home() {
  let categories: Awaited<ReturnType<typeof getWikiCategoriesWithCount>>;
  let featuredPages: Awaited<ReturnType<typeof getWikiPagesWithCategory>>;
  let allPages: Awaited<ReturnType<typeof getWikiPagesWithCategory>>;
  let totalPages: number;
  let totalViews: number;
  let updates: Awaited<ReturnType<typeof getRecentUpdates>>;

  try {
    [categories, featuredPages, allPages, totalPages, totalViews, updates] =
      await Promise.all([
        getWikiCategoriesWithCount(),
        getWikiPagesWithCategory({ featured: true, limit: FEATURED_COUNT }),
        getWikiPagesWithCategory({ limit: 30 }),
        getWikiPageCount(),
        getWikiTotalViews(),
        getRecentUpdates(),
      ]);
  } catch (err) {
    console.error("[Wiki] Failed to load wiki data:", err);
    return (
      <section className="wiki-hero">
        <div className="wiki-hero-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.6ureleaks.com/logos/Untitled10.png"
            alt=""
            className="wiki-hero-logo"
            draggable={false}
          />
        </div>
        <p className="wiki-hero-badge">Documentation & Guides</p>
        <h1 className="wiki-hero-title">Wiki</h1>
        <div style={{ marginTop: 24, padding: 24, background: "var(--card-bg, #2b2d31)", borderRadius: 12, maxWidth: 480 }}>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 15 }}>
            Wiki is temporarily unavailable. Please try again later.
          </p>
          <Link href="/wiki" style={{ display: "inline-block", marginTop: 16, color: "var(--discord-blurple)" }}>
            Try again
          </Link>
        </div>
      </section>
    );
  }

  const featured: typeof allPages =
    featuredPages.length > 0 ? featuredPages : allPages.slice(0, FEATURED_COUNT);
  const recent = allPages;
  const views = totalViews;

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return (
    <>
      <section className="wiki-hero">
        <div className="wiki-hero-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.6ureleaks.com/logos/Untitled10.png"
            alt=""
            className="wiki-hero-logo"
            draggable={false}
          />
        </div>
        <p className="wiki-hero-badge">Documentation & Guides</p>
        <h1 className="wiki-hero-title">Wiki</h1>
        <p className="wiki-hero-subtitle">
          Everything you need - tutorials, resources, guides, and more.
        </p>
        <div className="wiki-hero-actions">
          <Link href="#featured" className="wiki-btn-hero">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Browse Articles
          </Link>
          <WikiSearchHint />
        </div>

        <div className="wiki-stats">
          <div className="wiki-stat">
            <span className="wiki-stat-value">{totalPages}</span>
            <span className="wiki-stat-label">Articles</span>
          </div>
          <div className="wiki-stat-divider" />
          <div className="wiki-stat">
            <span className="wiki-stat-value">{categories.length}</span>
            <span className="wiki-stat-label">Categories</span>
          </div>
          <div className="wiki-stat-divider" />
          <div className="wiki-stat">
            <span className="wiki-stat-value">{views.toLocaleString()}</span>
            <span className="wiki-stat-label">Total Views</span>
          </div>
        </div>
      </section>

      {updates.length > 0 && (
        <section className="wiki-home-section wiki-updates-section">
          <RecentUpdatesCard updates={updates} />
        </section>
      )}

      {featured.length > 0 && (
        <section id="featured" className="wiki-home-section">
          <div className="wiki-section-header">
            <h2 className="wiki-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--discord-blurple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Featured Articles
            </h2>
          </div>
          <div className="wiki-featured-grid">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/wiki/p/${p.slug}`}
                className="wiki-featured-card"
              >
                <div className="wiki-featured-card-inner">
                  {p.category_name && (
                    <span className="wiki-featured-cat">{p.category_name}</span>
                  )}
                  <h3 className="wiki-featured-title">{p.title}</h3>
                  {p.description && (
                    <p className="wiki-featured-desc">{p.description}</p>
                  )}
                  <div className="wiki-featured-footer">
                    <span className="wiki-featured-date">
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                      }).format(toDate(p.updatedAt))}
                    </span>
                    {p.viewCount > 0 && (
                      <span className="wiki-featured-views">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {p.viewCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="wiki-home-section">
          <div className="wiki-section-header">
            <h2 className="wiki-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--discord-blurple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
              Categories
            </h2>
          </div>
          <div className="wiki-cat-grid">
            {categories.map((c) => (
              <Link key={c.id} href={`/wiki/c/${c.slug}`} className="wiki-cat-pill">
                <span className="wiki-cat-pill-name">{c.name}</span>
                <span className="wiki-cat-pill-count">{c.pageCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wiki-home-section">
        <div className="wiki-section-header">
          <h2 className="wiki-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--discord-blurple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            All Articles
          </h2>
          <span className="wiki-section-count">{totalPages} articles</span>
        </div>
        <div className="wiki-articles-list">
          {recent.length ? (
            recent.map((p) => (
              <Link key={p.id} href={`/wiki/p/${p.slug}`} className="wiki-article-row">
                <div className="wiki-article-row-left">
                  <span className="wiki-article-row-title">{p.title}</span>
                  {p.category_name && (
                    <span className="wiki-article-row-cat">{p.category_name}</span>
                  )}
                </div>
                <div className="wiki-article-row-right">
                  {p.viewCount > 0 && (
                    <span className="wiki-article-row-views">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      {p.viewCount}
                    </span>
                  )}
                  <span className="wiki-article-row-date">
                    {new Intl.DateTimeFormat(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(toDate(p.updatedAt))}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, padding: 20 }}>
              No pages yet. Create a first article from the admin dashboard.
            </p>
          )}
        </div>
      </section>

      <WikiSuggestChangesCard />
    </>
  );
}
