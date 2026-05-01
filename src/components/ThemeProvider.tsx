"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCookiePreferences, syncCurrentPrefsToCookie } from "@/lib/cookie-preferences";

export type ThemeValue = "dark" | "light" | "system";
export type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  themeValue: ThemeValue;
  setTheme: (t: Theme) => void;
  setThemeValue: (t: ThemeValue) => void;
  toggle: () => void;
} | null>(null);

const THEME_STORAGE_KEY = "settings-theme";

function getResolvedTheme(value: ThemeValue): Theme {
  if (typeof window === "undefined") return "dark";
  if (value === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return value === "light" || value === "dark" ? value : "dark";
}

function setThemeCookie(theme: Theme) {
  if (typeof document === "undefined") return;
  if (!getCookiePreferences().functional) return;
  document.cookie = `6ure-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  localStorage.setItem("wiki-theme", theme);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeValue, setThemeValueState] = useState<ThemeValue>("dark");
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    syncCurrentPrefsToCookie();
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(THEME_STORAGE_KEY)) ||
      (typeof document !== "undefined" && document.cookie.split("; ").find((r) => r.startsWith("6ure-theme="))?.split("=")[1]);
    const v: ThemeValue = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    setThemeValueState(v);
    const resolved = getResolvedTheme(v);
    setThemeState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolved === "light" ? "light" : "dark");
    }
  }, []);

  useEffect(() => {
    const resolved = getResolvedTheme(themeValue);
    setThemeState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolved === "light" ? "light" : "dark");
      setThemeCookie(resolved);
      if (getCookiePreferences().functional) {
        localStorage.setItem(THEME_STORAGE_KEY, themeValue);
      }
    }
  }, [themeValue]);

  useEffect(() => {
    if (themeValue !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const resolved = mq.matches ? "light" : "dark";
      setThemeState(resolved);
      document.documentElement.setAttribute("data-theme", resolved === "light" ? "light" : "dark");
      setThemeCookie(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeValue]);

  const setTheme = useCallback((t: Theme) => {
    setThemeValueState(t);
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
      setThemeCookie(t);
      if (getCookiePreferences().functional) {
        localStorage.setItem(THEME_STORAGE_KEY, t);
      }
    }
  }, []);

  const setThemeValue = useCallback((v: ThemeValue) => {
    setThemeValueState(v);
    const resolved = getResolvedTheme(v);
    setThemeState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolved === "light" ? "light" : "dark");
      setThemeCookie(resolved);
      if (getCookiePreferences().functional) {
        localStorage.setItem(THEME_STORAGE_KEY, v);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      setThemeValueState(next);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "dark");
        setThemeCookie(next);
        if (getCookiePreferences().functional) {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        }
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeValue, setTheme, setThemeValue, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
