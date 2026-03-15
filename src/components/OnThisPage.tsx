"use client";

import { useEffect, useState } from "react";
import { slug as githubSlug } from "github-slugger";

type Heading = { level: 2 | 3; text: string; id: string };

function extractCustomId(s: string): string | null {
  const m = s.match(/\s*\{#?([\w-]+)\}\s*$/);
  return m ? m[1] : null;
}

function stripHeadingToPlain(s: string): string {
  return s
    .replace(/\s*\{#?[\w-]+\}\s*$/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]/g, "$1")
    .trim();
}

function slugFromHeadingText(text: string): string {
  return githubSlug(stripHeadingToPlain(text));
}

function stripFrontmatter(markdown: string): string {
  const match = markdown.match(/^---\s*\n[\s\S]*?\n---\s*\n?/m);
  return match ? markdown.slice(match[0].length) : markdown;
}

function extractHeadings(markdown: string): Heading[] {
  const body = stripFrontmatter(markdown.replace(/\r\n/g, "\n"));
  const lines = body.split("\n");
  const out: Heading[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) {
      const raw = h2[1].trim();
      const customId = extractCustomId(raw);
      out.push({ level: 2, text: stripHeadingToPlain(raw), id: customId || slugFromHeadingText(raw) });
    }
    if (h3) {
      const raw = h3[1].trim();
      const customId = extractCustomId(raw);
      out.push({ level: 3, text: stripHeadingToPlain(raw), id: customId || slugFromHeadingText(raw) });
    }
  }
  return out;
}

type Props = { markdown: string };

export function OnThisPage({ markdown }: Props) {
  const headings = extractHeadings(markdown);
  const [activeId, setActiveId] = useState<string | null>(null);

  const idList = headings.map((h) => h.id).join(",");
  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      let current: string | null = null;
      for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el && el.getBoundingClientRect().top <= 140) {
          current = headings[i].id;
          break;
        }
      }
      setActiveId((prev) => (current !== null ? current : prev ?? headings[0]?.id ?? null));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [idList, headings.length]);

  return (
    <aside className="wiki-toc" aria-label="On this page">
      <h2 className="wiki-toc-title">On this page</h2>
      {headings.length === 0 ? (
        <p className="wiki-toc-empty">No sections on this page.</p>
      ) : (
        <ul className="wiki-toc-list">
          {headings.map((h) => (
            <li key={h.id} className={h.level === 3 ? "wiki-toc-item-h3" : "wiki-toc-item"}>
              <a
                href={`#${h.id}`}
                className={`wiki-toc-link ${activeId === h.id ? "wiki-toc-link-active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.replaceState(null, "", `#${h.id}`);
                  }
                }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
