const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://6ureleaks.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
