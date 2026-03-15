"use client";

import { useEffect, useState } from "react";

type Props = { slug: string; initialViewCount: number };

export function PageViewClient({ slug, initialViewCount }: Props) {
  const [count, setCount] = useState(initialViewCount);

  useEffect(() => {
    fetch(`/api/pages/${encodeURIComponent(slug)}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.viewCount === "number") setCount(data.viewCount);
      })
      .catch(() => {});
  }, [slug]);

  return (
    <span className="wiki-meta-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      {count} {count === 1 ? "view" : "views"}
    </span>
  );
}
