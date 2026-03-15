import { getAboutContent } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

/** Public API: returns about page content (stats, hero, etc.) from dashboard-managed content.json */
export async function GET() {
  const content = await getAboutContent();
  return new Response(JSON.stringify(content), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
