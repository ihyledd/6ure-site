/**
 * Strip markdown to plain text for excerpt (remove #, *, [], etc.)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^---[\s\S]*?---/m, "") // frontmatter
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

const SNIPPET_LEN = 120;
const SNIPPET_PAD = 80;

/**
 * Build a short excerpt around the first match of `query` in `plainText`.
 * Wraps the matching substring in {{}} so the client can highlight it.
 */
export function buildExcerpt(plainText: string, query: string): string {
  const lower = plainText.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return plainText.slice(0, SNIPPET_LEN) + (plainText.length > SNIPPET_LEN ? "…" : "");

  const idx = lower.indexOf(q);
  if (idx === -1) return plainText.slice(0, SNIPPET_LEN) + (plainText.length > SNIPPET_LEN ? "…" : "");

  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(plainText.length, idx + q.length + SNIPPET_PAD);
  let snippet = (start > 0 ? "…" : "") + plainText.slice(start, end) + (end < plainText.length ? "…" : "");

  // Wrap all case-insensitive occurrences of query in snippet with {{term}}
  const re = new RegExp(`(${escapeRe(q)})`, "gi");
  snippet = snippet.replace(re, "{{$1}}");
  return snippet;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
