#!/usr/bin/env node
/**
 * Sync about page content from data/content.json to the database.
 * Uses MySQL (mysql2) and DB_* env vars — no Prisma.
 * Run: node scripts/seed-about-content.js
 * Or: npm run db:seed-about
 */
require("dotenv").config({ path: require("path").join(process.cwd(), ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const CONTENT_FILE = path.join(process.cwd(), "data", "content.json");
const KEY = "about_content";

async function main() {
  let data;
  try {
    const raw = fs.readFileSync(CONTENT_FILE, "utf-8");
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Could not read data/content.json:", e.message);
    process.exit(1);
  }

  if (!data || (typeof data.stat_downloads !== "number" && typeof data.stat_presets !== "number")) {
    console.error("content.json must have stat_downloads and/or stat_presets as numbers");
    process.exit(1);
  }

  const content = {
    hero_headline: data.hero_headline ?? "Welcome to 6ure",
    hero_description: data.hero_description ?? "Your premium community for the latest content, presets, and support.",
    about_story: data.about_story ?? "",
    about_mission: data.about_mission ?? "",
    about_vision: data.about_vision ?? "",
    stat_downloads: typeof data.stat_downloads === "number" ? data.stat_downloads : 1000000,
    stat_presets: typeof data.stat_presets === "number" ? data.stat_presets : 5000,
    stat_support_label: data.stat_support_label ?? "24/7",
  };

  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "6ure_requests";

  const pool = mysql.createPool({ host, port, user, password, database });
  try {
    await pool.execute(
      "INSERT INTO site_settings (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()",
      [KEY, JSON.stringify(content)]
    );
  } finally {
    await pool.end();
  }

  console.log("About content synced to database:");
  console.log(`  stat_downloads: ${content.stat_downloads.toLocaleString()}`);
  console.log(`  stat_presets:   ${content.stat_presets.toLocaleString()}`);
  console.log(`  stat_support_label: ${content.stat_support_label}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
