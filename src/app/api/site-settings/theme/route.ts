import { getThemeSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Public: returns current theme settings for the 6ure site. */
export async function GET() {
  const theme = await getThemeSettings();
  return Response.json(theme);
}
