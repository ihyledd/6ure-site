export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Detect frontmatter `search: false` (VitePress-style) to exclude page from search */
export function hasSearchFalseInFrontmatter(content: string): boolean {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/m);
  if (!match) return false;
  const front = match[1];
  return /^search\s*:\s*false(\s*#.*)?$/m.test(front);
}

