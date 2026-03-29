import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPageBySlug, getPageCategories, getCategoryIdsByPageId, getRelatedPages } from "@/lib/dal/pages";
import { UNLOCK_COOKIE, verifySignedCookie } from "@/lib/wiki-unlock-cookie";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const page = await getPageBySlug(slug);

  if (!page || !page.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!page.password) {
    return jsonContent(page, slug);
  }

  if (isAdmin) {
    return jsonContent(page, slug);
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(UNLOCK_COOKIE)?.value;
  const slugs = verifySignedCookie(raw) ?? [];

  if (!slugs.includes(slug)) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  return jsonContent(page, slug);
}

async function jsonContent(
  page: { id: string; content: string; title: string; description: string | null; viewCount: number; updatedAt: Date | string },
  slug: string
) {
  const categories = await getPageCategories(page.id);
  const categoryIds = await getCategoryIdsByPageId(page.id);
  const relatedRows = await getRelatedPages(slug, categoryIds, 4);
  const related = relatedRows.map((r) => ({
    slug: r.slug,
    title: r.title,
    categories: r.categoryName ? [{ category: { name: r.categoryName } }] : [],
  }));

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  return NextResponse.json({
    content: page.content,
    title: page.title,
    description: page.description,
    updatedAt: toDate(page.updatedAt).toISOString(),
    viewCount: page.viewCount,
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    related,
  });
}
