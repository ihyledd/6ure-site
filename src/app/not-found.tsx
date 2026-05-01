import Link from "next/link";
import Image from "next/image";

import { SearchBox } from "@/components/SearchOverlay";

export default function NotFound() {
  return (
    <div className="wiki-404">
      <div className="wiki-404-orb wiki-404-orb-1" aria-hidden="true" />
      <div className="wiki-404-orb wiki-404-orb-2" aria-hidden="true" />
      <div className="wiki-404-card">
        <div className="wiki-404-content">
          <div className="wiki-404-logo-wrap">
            <Image
              src="https://images.6ureleaks.com/logos/Untitled10.png"
              alt="6ure"
              width={72}
              height={72}
              unoptimized
              className="wiki-404-logo"
            />
          </div>
          <h1 className="wiki-404-title">404</h1>
          <p className="wiki-404-subtitle">Page Not Found</p>
          <p className="wiki-404-text">
            This page doesn&apos;t exist, was moved, or you may have mistyped the URL.
          </p>
          <div className="wiki-404-actions">
            <SearchBox />
            <Link href="/" className="wiki-404-home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
