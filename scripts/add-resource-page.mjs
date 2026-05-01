#!/usr/bin/env node
/**
 * Add the missing resource page from content/6ure-wiki/resource.md.
 * Run from project root: node scripts/add-resource-page.mjs
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { randomBytes } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CONTENT_FILE = path.join(ROOT, "content", "6ure-wiki", "resource.md");

function getMysqlConfig() {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "6ure_requests",
  };
}

function cuidLike() {
  const t = Date.now().toString(36);
  const r = randomBytes(10).toString("hex").slice(0, 10);
  return "c" + t + r;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const content = fs.readFileSync(CONTENT_FILE, "utf8").replace(/\r\n/g, "\n");
  const title = "Resource";
  const slug = "resource";
  const searchable = !content.includes("search: false");
  const categorySlug = "resources";
  const categoryName = "Resources";

  const conn = await mysql.createConnection(getMysqlConfig());

  const [existingPage] = await conn.execute("SELECT id FROM Page WHERE slug = ?", [slug]);
  if (existingPage.length > 0) {
    console.log("==> Page 'resource' already exists, updating content...");
    await conn.execute(
      "UPDATE Page SET title = ?, content = ?, searchable = ?, published = 1, updatedAt = NOW() WHERE slug = ?",
      [title, content, searchable ? 1 : 0, slug]
    );
    console.log("==> Done.");
    await conn.end();
    return;
  }

  const [catRows] = await conn.execute("SELECT id FROM Category WHERE slug = ?", [categorySlug]);
  let categoryId;
  if (catRows.length > 0) {
    categoryId = catRows[0].id;
  } else {
    categoryId = cuidLike();
    await conn.execute(
      "INSERT INTO Category (id, slug, name, hidden) VALUES (?, ?, ?, 0)",
      [categoryId, categorySlug, categoryName]
    );
  }

  const pageId = cuidLike();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await conn.execute(
    "INSERT INTO Page (id, slug, title, content, published, searchable, featured, hidden, viewCount, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, 0, 0, 0, ?, ?)",
    [pageId, slug, title, content, searchable ? 1 : 0, now, now]
  );
  await conn.execute(
    "INSERT INTO PageCategory (pageId, categoryId) VALUES (?, ?)",
    [pageId, categoryId]
  );

  console.log("==> Created page 'resource' and linked to Resources category.");
  await conn.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
