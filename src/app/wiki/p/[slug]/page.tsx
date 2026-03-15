import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { Markdown } from "@/components/Markdown";
import { OnThisPage } from "@/components/OnThisPage";
import { PageViewClient } from "@/components/PageViewClient";
import { PasswordGate } from "@/components/PasswordGate";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleActions } from "@/components/ArticleActions";
import {
  getPageBySlug,
  getPageCategories,
  getCategoryIdsByPageId,
  getRelatedPages,
} from "@/lib/dal/pages";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://6ureleaks.com/wiki";
const OG_IMAGE = "https://images.6ureleaks.com/logos/Untitled10.png";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || !page.published) return { title: "Not found" };
  const title = `${page.title} – 6ure Wiki`;
  const description = page.description ?? `Read ${page.title} on 6ure Wiki.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/p/${slug}`,
      siteName: "6ure Wiki",
      images: [{ url: OG_IMAGE, width: 512, height: 512, alt: "6ure" }],
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PageView({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const page = await getPageBySlug(slug);
  if (!page || (!page.published && !session?.user?.id)) notFound();

  const categories = await getPageCategories(page.id);
  const categoryIds = await getCategoryIdsByPageId(page.id);
  const relatedRows = await getRelatedPages(slug, categoryIds, 4);
  const related = relatedRows.map((r) => ({
    slug: r.slug,
    title: r.title,
    categories: r.categoryName ? [{ category: { name: r.categoryName } }] : [],
  }));

  const isLocked = !!page.password && !isAdmin;

  if (isLocked) {
    return <PasswordGate slug={slug} title={page.title} />;
  }

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);
  const wordCount = page.content.split(/\s+/).filter(Boolean).length;
  const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="wiki-docs-content">
      <div className="wiki-docs-article">
        <header className="wiki-article-header">
          <Link href="/wiki" className="wiki-article-back">
            &#8592; Back to Wiki
          </Link>
          <h1 className="wiki-article-title">{page.title}</h1>
          <div className="wiki-article-meta">
            {categories.length > 0 &&
              categories.map(({ categoryId, slug: catSlug, name }) => (
                <Link key={categoryId} href={`/wiki/c/${catSlug}`} className="wiki-meta-pill wiki-meta-pill-cat">
                  {name}
                </Link>
              ))}
            <span className="wiki-meta-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {new Intl.DateTimeFormat(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(toDate(page.updatedAt))}
            </span>
            <span className="wiki-meta-pill wiki-meta-pill-readtime">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ~{readingTimeMins} min read
            </span>
            <PageViewClient slug={slug} initialViewCount={page.viewCount} />
          </div>
        </header>

        <ArticleActions slug={slug} title={page.title} />

        <article className="wiki-article-body">
          <Markdown markdown={page.content} slug={slug} />
        </article>

        {related.length > 0 && (
          <RelatedArticles related={related} />
        )}
      </div>
      <OnThisPage markdown={page.content} />
    </div>
  );
}
