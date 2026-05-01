import { getPublishedPagesForSitemap, getCategoriesForSitemap } from "@/lib/dal/pages";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://6ureleaks.com/wiki";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const baseEntry = {
    url: BASE,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  };

  try {
    const [pages, categories] = await Promise.all([
      getPublishedPagesForSitemap(),
      getCategoriesForSitemap(),
    ]);

    const pageUrls = pages.map((p) => ({
      url: `${BASE}/p/${p.slug}`,
      lastModified: typeof p.updatedAt === "string" ? new Date(p.updatedAt) : p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const categoryUrls = categories.map((c) => ({
      url: `${BASE}/c/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [baseEntry, ...pageUrls, ...categoryUrls];
  } catch {
    return [baseEntry];
  }
}
