import Link from "next/link";

import { SearchBox } from "@/components/SearchOverlay";

export default function NotFound() {
  return (
    <div className="wiki-404">
      <div className="wiki-404-card">
        <div className="wiki-404-content">
          <h1 className="wiki-404-title">404</h1>
          <p className="wiki-404-text">This page doesn’t exist or was moved.</p>
          <div className="wiki-404-actions">
            <SearchBox />
            <Link href="/" className="wiki-404-home">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
