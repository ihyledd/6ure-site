import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { updateThemeSettings, type ThemeSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS: (keyof ThemeSettings)[] = [
  "theme_active",
  "theme_winter_snow_enabled",
  "theme_winter_snow_intensity",
  "theme_winter_frost_borders",
  "theme_winter_blue_tint",
  "theme_winter_snowflake_cursor",
  "theme_winter_aurora_bg",
  "theme_spring_green_tint",
  "theme_spring_blossom_glow",
  "theme_spring_leaf_cursor",
];

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<ThemeSettings>;
  const data: Partial<ThemeSettings> = {};
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined && typeof body[key] === "string") {
      data[key] = body[key];
    }
  }
  await updateThemeSettings(data);
  return Response.json({ ok: true });
}
