import { NextRequest } from "next/server";
import { searchPages } from "@/lib/dal/pages";
import { buildExcerpt, stripMarkdown } from "@/lib/search";

export const dynamic = "force-dynamic";

export type SearchResult = {
  slug: string;
  title: string;
  breadcrumb: string[];
  excerpt: string;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return Response.json({ results: [], total: 0 });
  }

  const pages = await searchPages(q, 20);

  const results: SearchResult[] = pages.map((p) => {
    const plain = stripMarkdown(p.content);
    const excerpt = buildExcerpt(plain, q);
    const breadcrumb = p.categoryNames ? p.categoryNames.split(",").map((s) => s.trim()) : [];
    if (breadcrumb.length === 0) breadcrumb.push(p.title);

    return {
      slug: p.slug,
      title: p.title,
      breadcrumb,
      excerpt,
    };
  });

  return Response.json({ results, total: results.length });
}
