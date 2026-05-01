"use client";

import { useEffect, useState } from "react";
import { useSearch } from "@/contexts/SearchContext";

function usePlatform() {
  const [platform, setPlatform] = useState<"mac" | "windows" | "mobile">("mac");
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const narrow = typeof window !== "undefined" && window.innerWidth < 768;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua) || coarse || narrow;
    if (isMobile) {
      setPlatform("mobile");
    } else if (/Mac|iPhone|iPad/i.test(navigator.platform || "")) {
      setPlatform("mac");
    } else {
      setPlatform("windows");
    }
  }, []);
  return platform;
}

/** Floating search trigger - same style as scroll-to-top, opens search overlay. */
export function WikiFloatingSearch() {
  const { openSearch } = useSearch();
  const platform = usePlatform();
  const title =
    platform === "mac"
      ? "Search (⌘K)"
      : platform === "windows"
        ? "Search (Ctrl+K)"
        : "Search";

  return (
    <button
      type="button"
      onClick={openSearch}
      className="wiki-floating-search"
      aria-label={title}
      title={title}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  );
}
