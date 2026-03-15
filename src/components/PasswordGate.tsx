"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { OnThisPage } from "@/components/OnThisPage";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ArticleActions } from "@/components/ArticleActions";
import { PageViewClient } from "@/components/PageViewClient";

type ContentPayload = {
  content: string;
  title: string;
  description: string | null;
  updatedAt: string;
  viewCount: number;
  categories: { name: string; slug: string }[];
  related: { slug: string; title: string; categories: { category: { name: string } }[] }[];
};

export function PasswordGate({
  slug,
  title,
}: {
  slug: string;
  title?: string;
}) {
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        const contentRes = await fetch(`/api/pages/${slug}/content`);
        if (contentRes.ok) {
          const payload = await contentRes.json();
          setContent(payload);
        } else {
          setError("Failed to load content");
        }
      } else {
        setError("Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (content) {
    const wordCount = content.content.split(/\s+/).filter(Boolean).length;
    const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));
    const dateStr = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(content.updatedAt));

    return (
      <div className="wiki-docs-content">
        <div className="wiki-docs-article">
          <header className="wiki-article-header">
            <Link href="/wiki" className="wiki-article-back">
              &#8592; Back to Wiki
            </Link>
            <h1 className="wiki-article-title">{content.title}</h1>
            <div className="wiki-article-meta">
              {content.categories.length > 0 &&
                content.categories.map((c) => (
                  <Link key={c.slug} href={`/wiki/c/${c.slug}`} className="wiki-meta-pill wiki-meta-pill-cat">
                    {c.name}
                  </Link>
                ))}
              <span className="wiki-meta-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {dateStr}
              </span>
              <span className="wiki-meta-pill wiki-meta-pill-readtime">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ~{readingTimeMins} min read
              </span>
              <PageViewClient slug={slug} initialViewCount={content.viewCount} />
            </div>
          </header>

          <ArticleActions slug={slug} title={content.title} />

          <article className="wiki-article-body">
            <Markdown markdown={content.content} slug={slug} />
          </article>

          {content.related.length > 0 && (
            <RelatedArticles related={content.related} />
          )}
        </div>
        <OnThisPage markdown={content.content} />
      </div>
    );
  }

  return (
    <div className="pw-gate">
      <div className="pw-gate-card">
        <div className="pw-gate-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--discord-blurple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="pw-gate-title">{title ? `"${title}" is locked` : "This page is locked"}</h2>
        <p className="pw-gate-subtitle">Enter the password to view this content.</p>
        <form onSubmit={handleSubmit} className="pw-gate-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="pw-gate-input"
            autoFocus
            required
          />
          {error && <p className="pw-gate-error">{error}</p>}
          <button type="submit" className="btn-primary pw-gate-btn" disabled={loading}>
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
