#!/usr/bin/env node
/**
 * Migrate Page (wiki) content from PostgreSQL to MySQL.
 * Restores full dashboard-edited content that was truncated in MySQL.
 *
 * Usage:
 *   node scripts/migrate-page-from-postgres.mjs
 *   node scripts/migrate-page-from-postgres.mjs --dry-run
 *
 * Source: PostgreSQL (127.0.0.1:51214, postgres/postgres, template1)
 * Target: MySQL from DB_* env vars
 */
import "dotenv/config";
import pg from "pg";
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");

const PG_CONFIG = {
  host: "127.0.0.1",
  port: 51214,
  user: "postgres",
  password: "postgres",
  database: "template1",
};

function getMysqlConfig() {
  return {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "6ure_requests",
  };
}

function toMysqlValue(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace("T", " ");
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "object" && val !== null) return JSON.stringify(val);
  return val;
}

const PAGE_COLUMNS = [
  "id",
  "slug",
  "title",
  "description",
  "content",
  "published",
  "searchable",
  "featured",
  "hidden",
  "password",
  "viewCount",
  "createdAt",
  "updatedAt",
  "createdById",
];

async function main() {
  console.log("==> Migrate Page from PostgreSQL to MySQL");
  if (DRY_RUN) console.log("    (dry run - no changes)");

  const pgClient = new pg.Client(PG_CONFIG);
  const mysqlConfig = getMysqlConfig();

  try {
    await pgClient.connect();
    const mysqlConn = await mysql.createConnection(mysqlConfig);

    const r = await pgClient.query('SELECT * FROM "Page" ORDER BY slug');
    const rows = r.rows;
    console.log(`==> Found ${rows.length} pages in Postgres`);

    if (rows.length === 0) {
      console.log("==> No pages to migrate");
      await pgClient.end();
      await mysqlConn.end();
      return;
    }

    let updated = 0;
    let inserted = 0;

    for (const row of rows) {
      const colsEscaped = PAGE_COLUMNS.map((c) => "`" + c.replace(/`/g, "``") + "`");
      const placeholders = PAGE_COLUMNS.map(() => "?").join(", ");
      const insertSql = `INSERT INTO Page (${colsEscaped.join(", ")}) VALUES (${placeholders})`;
      const updateSql = `UPDATE Page SET ${PAGE_COLUMNS.filter((c) => c !== "id")
        .map((c) => "`" + c.replace(/`/g, "``") + "` = ?")
        .join(", ")} WHERE id = ?`;

      const values = PAGE_COLUMNS.map((c) => toMysqlValue(row[c]));

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] ${row.slug} (${row.title}) - content length: ${row.content?.length ?? 0}`);
        continue;
      }

      const [existing] = await mysqlConn.execute("SELECT id FROM Page WHERE id = ?", [row.id]);
      if (existing.length > 0) {
        const updateValues = PAGE_COLUMNS.filter((c) => c !== "id").map((c) => toMysqlValue(row[c]));
        updateValues.push(row.id);
        await mysqlConn.execute(updateSql, updateValues);
        updated++;
        console.log(`  [UPDATED] ${row.slug}`);
      } else {
        await mysqlConn.execute(insertSql, values);
        inserted++;
        console.log(`  [INSERTED] ${row.slug}`);
      }
    }

    console.log(`==> Done. Updated: ${updated}, Inserted: ${inserted}`);

    await pgClient.end();
    await mysqlConn.end();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
