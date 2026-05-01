import { query } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://6ureleaks.com/wiki";

export async function GET() {
  const pages = await query<{ slug: string; title: string; description: string | null; updatedAt: Date | string }>(
    "SELECT slug, title, description, updatedAt FROM Page WHERE published = true AND hidden = false ORDER BY updatedAt DESC LIMIT 30",
    []
  );

  const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);

  const items = pages
    .map(
      (p) => `
    <item>
      <title><![CDATA[${escapeXml(p.title)}]]></title>
      <link>${BASE}/p/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/p/${p.slug}</guid>
      <description><![CDATA[${escapeXml(p.description ?? p.title)}]]></description>
      <pubDate>${toDate(p.updatedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>6ure Wiki</title>
    <link>${BASE}</link>
    <description>Wiki – 6ureleaks. Documentation and guides.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
