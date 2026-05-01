import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getAboutContent, saveAboutContent, type AboutContent } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const content = await getAboutContent();
  return Response.json(content);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<AboutContent>;
  const current = await getAboutContent();
  const updated: AboutContent = {
    hero_headline: typeof body.hero_headline === "string" ? body.hero_headline : current.hero_headline,
    hero_description: typeof body.hero_description === "string" ? body.hero_description : current.hero_description,
    about_story: typeof body.about_story === "string" ? body.about_story : current.about_story,
    about_mission: typeof body.about_mission === "string" ? body.about_mission : current.about_mission,
    about_vision: typeof body.about_vision === "string" ? body.about_vision : current.about_vision,
    stat_downloads: typeof body.stat_downloads === "number" ? Math.max(0, body.stat_downloads) : current.stat_downloads,
    stat_presets: typeof body.stat_presets === "number" ? Math.max(0, body.stat_presets) : current.stat_presets,
    stat_support_label: typeof body.stat_support_label === "string" ? body.stat_support_label : current.stat_support_label,
  };
  await saveAboutContent(updated);
  return Response.json({ ok: true });
}
