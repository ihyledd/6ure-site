"use client";

import { useEffect, useState } from "react";

type Platform = "mac" | "windows" | "mobile";

function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("mac");
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = typeof window !== "undefined" && window.innerWidth < 768;
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(ua) || coarse || narrow;
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

const SearchIconInline = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline-block", verticalAlign: "-2px" }}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/** Search keyboard shortcut hint for wiki pages. */
export function WikiSearchHint() {
  const platform = usePlatform();
  if (platform === "mobile") {
    return (
      <span className="wiki-hero-hint">
        Use the search icon to search
      </span>
    );
  }
  return (
    <span className="wiki-hero-hint">
      {platform === "mac"
        ? "Press ⌘K to search, or use the search icon"
        : "Press Ctrl+K to search, or use the search icon"}
    </span>
  );
}
