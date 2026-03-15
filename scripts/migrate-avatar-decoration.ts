#!/usr/bin/env node
/**
 * Add avatar_decoration column to users table if missing.
 * Run: npx tsx scripts/migrate-avatar-decoration.ts
 * Or: npm run migrate:avatar-decoration
 */
import "dotenv/config";
import { queryOne, execute } from "../src/lib/db";

async function run() {
  const dbName = process.env.DB_NAME ?? "6ure_requests";
  const exists = await queryOne<{ n: number }>(
    `SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE table_schema = ? AND table_name = 'users' AND column_name = 'avatar_decoration'`,
    [dbName]
  );
  if (exists && Number(exists.n) > 0) {
    console.log("[AvatarDecorationMigration] Column avatar_decoration already exists.");
    return;
  }
  await execute("ALTER TABLE users ADD COLUMN avatar_decoration VARCHAR(255) NULL");
  console.log("[AvatarDecorationMigration] Added avatar_decoration column to users table.");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[AvatarDecorationMigration]", e);
    process.exit(1);
  });
