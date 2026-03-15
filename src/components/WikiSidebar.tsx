"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavCategory } from "@/lib/nav";

type Props = { nav: NavCategory[] };

export function WikiSidebar({ nav }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    nav.forEach((c) => {
      const isActive = c.pages.some((p) => pathname === `/wiki/p/${p.slug}`);
      o[c.id] = isActive || true;
    });
    return o;
  });

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className="wiki-sidebar">
      <nav className="wiki-sidebar-nav" aria-label="Wiki navigation">
        {nav.map((cat) => {
          const isOpen = open[cat.id] !== false;
          const hasActive = cat.pages.some((p) => pathname === `/wiki/p/${p.slug}`);
          return (
            <div key={cat.id} className="wiki-sidebar-group">
              <button
                type="button"
                className="wiki-sidebar-group-title"
                onClick={() => toggle(cat.id)}
                aria-expanded={isOpen}
              >
                <span>{cat.name}</span>
                <span className="wiki-sidebar-chevron" aria-hidden>
                  {isOpen ? "▼" : "▶"}
                </span>
              </button>
              {isOpen && (
                <ul className="wiki-sidebar-list">
                  {cat.pages.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/wiki/p/${p.slug}`}
                        className={`wiki-sidebar-link ${pathname === `/wiki/p/${p.slug}` ? "wiki-sidebar-link-active" : ""}`}
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
