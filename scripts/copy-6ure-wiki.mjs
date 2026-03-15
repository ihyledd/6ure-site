#!/usr/bin/env node
/**
 * Fetches .md files from github.com/ihyledd/6ure-wiki and writes them to content/6ure-wiki/
 * Run once: node scripts/copy-6ure-wiki.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = "https://raw.githubusercontent.com/ihyledd/6ure-wiki/main";

const FILES = [
  "faq/general.md",
  "resources/windows.md",
  "resources/macos.md",
  "resources/extras.md",
  "beginners.md",
  "guide/community-support.md",
  "guide/faq.md",
  "guide/moderator.md",
  "guide/partner-manager.md",
  "guide/predefined-reasons.md",
  "resource.md",
  "websites.md",
];

async function main() {
  const outDir = path.join(ROOT, "content", "6ure-wiki");
  for (const file of FILES) {
    const url = `${BASE}/${file}`;
    const dest = path.join(outDir, file);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, text.replace(/\r\n/g, "\n"), "utf8");
      console.log("OK", file);
    } catch (e) {
      console.error("FAIL", file, e.message);
    }
  }
}

main();
