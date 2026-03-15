"use client";

import { SearchBox } from "@/components/SearchOverlay";

/**
 * Renders search at the top of the page content (e.g. article/category pages)
 * so search is in-page instead of only in the global header.
 */
export function InPageSearchBar() {
  return (
    <div className="wiki-inpage-search">
      <SearchBox />
    </div>
  );
}
