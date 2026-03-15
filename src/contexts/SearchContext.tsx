"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type SearchResult = {
  slug: string;
  title: string;
  breadcrumb: string[];
  excerpt: string;
};

function Highlight({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{{") && part.endsWith("}}") ? (
          <mark key={i} className="search-highlight">{part.slice(2, -2)}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SearchOverlayInner({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSelected(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const total = results.length;

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); return; }
      if (e.key === "Enter" && results[selected]) { e.preventDefault(); onClose(); window.location.href = `/wiki/p/${results[selected].slug}`; }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [results, selected, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || selected < 0) return;
    const item = el.children[selected] as HTMLElement;
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  return (
    <div className="search-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={cardRef} className="search-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          <svg className="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="search-esc-btn" onClick={onClose}>Esc</button>
        </div>

        {query.trim() && !loading && (
          <div className="search-results-count">
            {total === 0 ? "No results" : `${total} result${total === 1 ? "" : "s"}`}
          </div>
        )}
        <div ref={listRef} className="search-results">
          {loading && <div className="search-empty">Searching...</div>}
          {!loading && query.trim() && results.length === 0 && (
            <div className="search-empty">No results for &ldquo;{query}&rdquo;</div>
          )}
          {!loading && !query.trim() && (
            <div className="search-empty search-empty-hint">Type to search across all articles</div>
          )}
          {!loading &&
            results.map((r, i) => (
              <Link
                key={r.slug}
                href={`/wiki/p/${r.slug}`}
                onClick={() => onClose()}
                className={`search-result ${i === selected ? "search-result-active" : ""}`}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="search-result-breadcrumb">{r.breadcrumb.join(" › ")}</div>
                <div className="search-result-excerpt"><Highlight text={r.excerpt} /></div>
              </Link>
            ))}
        </div>

        <div className="search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

type SearchContextValue = {
  openSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  const overlay = open && typeof document !== "undefined"
    ? createPortal(
        <SearchOverlayInner onClose={closeSearch} />,
        document.body,
      )
    : null;

  return (
    <SearchContext.Provider value={{ openSearch }}>
      {children}
      {overlay}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
