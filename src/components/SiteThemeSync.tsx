"use client";

import { useEffect, useState } from "react";

const THEME_API =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/site-settings/theme`
    : "";

type ThemePayload = {
  theme_active?: string;
  theme_winter_snow_enabled?: string;
  theme_winter_snow_intensity?: string;
  theme_winter_frost_borders?: string;
  theme_winter_blue_tint?: string;
  theme_winter_snowflake_cursor?: string;
  theme_winter_aurora_bg?: string;
  theme_spring_green_tint?: string;
  theme_spring_blossom_glow?: string;
  theme_spring_leaf_cursor?: string;
};

function applyTheme(theme: ThemePayload | null) {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return;

  const active = theme?.theme_active || "default";
  root.setAttribute("data-site-theme", active);

  const isWinter = active === "winter";
  root.classList.toggle("frost-borders", isWinter && theme?.theme_winter_frost_borders === "true");
  root.classList.toggle("winter-blue-tint", isWinter && theme?.theme_winter_blue_tint === "true");
  root.classList.toggle("snowflake-cursor", isWinter && theme?.theme_winter_snowflake_cursor === "true");
  root.classList.toggle("aurora-bg", isWinter && theme?.theme_winter_aurora_bg === "true");

  const isSpring = active === "spring";
  root.classList.toggle("spring-green-tint", isSpring && theme?.theme_spring_green_tint === "true");
  root.classList.toggle("spring-blossom-glow", isSpring && theme?.theme_spring_blossom_glow === "true");
  root.classList.toggle("leaf-cursor", isSpring && theme?.theme_spring_leaf_cursor === "true");
}

export function SiteThemeSync() {
  const [siteTheme, setSiteTheme] = useState<ThemePayload | null>(null);

  useEffect(() => {
    if (!THEME_API) return;
    fetch(THEME_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ThemePayload | null) => {
        setSiteTheme(data || null);
        applyTheme(data);
      })
      .catch(() => applyTheme(null));
  }, []);

  useEffect(() => {
    applyTheme(siteTheme);
  }, [siteTheme]);

  return null;
}
