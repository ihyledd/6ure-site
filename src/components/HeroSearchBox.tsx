"use client";

import { SearchBox } from "@/components/SearchOverlay";

/**
 * Renders the search trigger in the hero (middle of the page) so search
 * is prominent on the wiki home instead of only in the header.
 */
export function HeroSearchBox() {
  return (
    <div className="wiki-hero-search-wrap">
      <SearchBox />
    </div>
  );
}
