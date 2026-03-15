/**
 * Add avatar_decoration column to users table if missing.
 * Runs on startup via instrumentation.
 */
import { queryOne, execute } from "@/lib/db";

export async function runAvatarDecorationMigration(): Promise<void> {
  const dbName = process.env.DB_NAME ?? "6ure_requests";
  const exists = await queryOne<{ n: number }>(
    `SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.COLUMNS
     WHERE table_schema = ? AND table_name = 'users' AND column_name = 'avatar_decoration'`,
    [dbName]
  );
  if (exists && Number(exists.n) > 0) {
    return;
  }
  await execute("ALTER TABLE users ADD COLUMN avatar_decoration VARCHAR(255) NULL");
  console.log("[AvatarDecorationMigration] Added avatar_decoration column to users table.");
}
