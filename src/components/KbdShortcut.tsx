"use client";

import { useEffect, useState } from "react";

type Platform = "mac" | "windows" | "mobile";

function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("mac");
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(ua) ||
      ("ontouchstart" in window && window.innerWidth < 768);
    if (isMobile) {
      setPlatform("mobile");
    } else if (/Mac/i.test(navigator.platform)) {
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

export function KbdShortcut() {
  const platform = usePlatform();
  if (platform === "mobile") return <SearchIconInline />;
  return <kbd>{platform === "mac" ? "⌘ K" : "Ctrl + K"}</kbd>;
}

export function SearchHint() {
  const platform = usePlatform();
  if (platform === "mobile") {
    return (
      <span className="wiki-hero-hint">
        press <SearchIconInline /> to search
      </span>
    );
  }
  return (
    <span className="wiki-hero-hint">
      or press <kbd>{platform === "mac" ? "⌘ K" : "Ctrl + K"}</kbd> to search
    </span>
  );
}
