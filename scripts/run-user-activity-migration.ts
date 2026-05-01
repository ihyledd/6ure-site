#!/usr/bin/env node
/**
 * Add last_login_at and last_activity_at columns to users table if missing.
 * Usage: npx tsx scripts/run-user-activity-migration.ts
 */
import "dotenv/config";
import { queryOne, execute } from "../src/lib/db";

async function run() {
  const dbName = process.env.DB_NAME ?? "6ure_requests";

  const columns = ["last_login_at", "last_activity_at"] as const;

  for (const col of columns) {
    const existing = await queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.COLUMNS
       WHERE table_schema = ? AND table_name = 'users' AND column_name = ?`,
      [dbName, col]
    );
    if (existing && Number(existing.n) > 0) {
      console.log(`[Migrations] users: ${col} already exists.`);
    } else {
      await execute(
        `ALTER TABLE users ADD COLUMN ${col} DATETIME NULL DEFAULT NULL COMMENT '${
          col === "last_login_at" ? "Last time user logged in" : "Last activity timestamp"
        }'`
      );
      console.log(`[Migrations] users: added ${col}.`);
    }
  }

  console.log("[Migrations] users activity columns done.");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[Migrations]", e);
    process.exit(1);
  });

