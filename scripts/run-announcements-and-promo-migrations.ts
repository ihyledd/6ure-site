#!/usr/bin/env node
/**
 * Run announcements premium-promo and promo_popups migrations.
 * Usage: npx tsx scripts/run-announcements-and-promo-migrations.ts
 */
import "dotenv/config";
import { queryOne, execute } from "../src/lib/db";

async function run() {
  const dbName = process.env.DB_NAME ?? "6ure_requests";

  // 1. Announcements: add discount_percent and ends_at if missing
  const hasDiscount = await queryOne<{ n: number }>(
    `SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE table_schema = ? AND table_name = 'announcements' AND column_name = 'discount_percent'`,
    [dbName]
  );
  if (hasDiscount && Number(hasDiscount.n) > 0) {
    console.log("[Migrations] announcements: discount_percent and ends_at already exist.");
  } else {
    await execute(
      "ALTER TABLE announcements ADD COLUMN discount_percent INT NULL COMMENT 'e.g. 20 for 20% off', ADD COLUMN ends_at DATE NULL COMMENT 'Promo end date for display'"
    );
    console.log("[Migrations] announcements: added discount_percent and ends_at.");
  }

  // 2. Promo popups table
  const hasTable = await queryOne<{ n: number }>(
    `SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ? AND table_name = 'promo_popups'`,
    [dbName]
  );
  if (hasTable && Number(hasTable.n) > 0) {
    console.log("[Migrations] promo_popups table already exists.");
  } else {
    await execute(`
      CREATE TABLE IF NOT EXISTS promo_popups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL DEFAULT '',
        description TEXT,
        image_url VARCHAR(1024) NULL,
        features TEXT NULL,
        cta_text VARCHAR(255) NULL,
        cta_url VARCHAR(1024) NULL,
        active TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("[Migrations] promo_popups table created.");
  }

  console.log("[Migrations] Done.");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[Migrations]", e);
    process.exit(1);
  });
