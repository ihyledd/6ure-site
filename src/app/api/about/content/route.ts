import { getAboutContent } from "@/lib/admin-data";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public API: returns about page content (stats, hero, etc.) from dashboard-managed content.json */
export async function GET() {
  const content = await getAboutContent();
  
  try {
    // Fetch real stats from database
    const [stats, editorStats] = await Promise.all([
      queryOne<{ total_downloads: number; total_presets: number }>(
        "SELECT SUM(download_count) as total_downloads, COUNT(*) as total_presets FROM resources_items"
      ),
      queryOne<{ total_editors: number }>(
        "SELECT COUNT(*) as total_editors FROM resources_editors"
      )
    ]);

    if (stats) {
      content.stat_downloads = Number(stats.total_downloads || 0);
      content.stat_presets = Number(stats.total_presets || 0);
    }
    if (editorStats) {
      (content as any).stat_editors = Number(editorStats.total_editors || 0);
    }
  } catch (err) {
    console.error("[About API] Failed to fetch real stats:", err);
  }

  return new Response(JSON.stringify(content), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
