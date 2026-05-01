#!/usr/bin/env node
/**
 * Migrate data from old Prisma/PostgreSQL database to MySQL.
 * Merges data without wiping existing MySQL rows.
 *
 * Usage:
 *   DATABASE_URL="prisma+postgres://..." node scripts/migrate-prisma-to-mysql.mjs
 *   OLD_DATABASE_URL="postgres://user:pass@host:port/db" node scripts/migrate-prisma-to-mysql.mjs
 *   node scripts/migrate-prisma-to-mysql.mjs --dry-run
 *   node scripts/migrate-prisma-to-mysql.mjs --limit=10
 *
 * Source: OLD_DATABASE_URL (direct postgres://) or DATABASE_URL (postgres:// or prisma+postgres://).
 * prisma+postgres:// is decoded to extract the direct Postgres URL from the api_key.
 * Target: DB_* env vars for MySQL.
 */
import "dotenv/config";
import pg from "pg";
import mysql from "mysql2/promise";

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const ROW_LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : null;

// Tables in dependency order. strategy: 'ignore' | 'merge'
const TABLES = [
  { name: "User", pgQuoted: true, strategy: "ignore" },
  { name: "Account", pgQuoted: true, strategy: "ignore" },
  { name: "Session", pgQuoted: true, strategy: "ignore" },
  { name: "VerificationToken", pgQuoted: true, strategy: "ignore" },
  { name: "Category", pgQuoted: true, strategy: "ignore" },
  { name: "Page", pgQuoted: true, strategy: "ignore" },
  { name: "PageCategory", pgQuoted: true, strategy: "ignore" },
  { name: "ManualUpdate", pgQuoted: true, strategy: "ignore" },
  { name: "site_settings", pgQuoted: false, strategy: "merge", mergeKey: "key" },
  { name: "ContactMessage", pgQuoted: true, strategy: "ignore" },
  { name: "DataExportRequest", pgQuoted: true, strategy: "ignore" },
  { name: "ApplicationForm", pgQuoted: true, strategy: "ignore" },
  { name: "ApplicationFormSection", pgQuoted: true, strategy: "ignore" },
  { name: "ApplicationFormField", pgQuoted: true, strategy: "ignore" },
  { name: "ApplicationSubmission", pgQuoted: true, strategy: "ignore" },
  { name: "ApplicationLimitReset", pgQuoted: true, strategy: "ignore" },
  { name: "users", pgQuoted: false, strategy: "merge", mergeKey: "id" },
  { name: "requests", pgQuoted: false, strategy: "skip_exists" },
  { name: "upvotes", pgQuoted: false, strategy: "ignore" },
  { name: "comments", pgQuoted: false, strategy: "skip_exists" },
  { name: "comment_bans", pgQuoted: false, strategy: "ignore" },
  { name: "notifications", pgQuoted: false, strategy: "ignore" },
  { name: "request_views", pgQuoted: false, strategy: "ignore" },
  { name: "faqs", pgQuoted: false, strategy: "ignore" },
  { name: "announcements", pgQuoted: false, strategy: "ignore" },
  { name: "protected_users", pgQuoted: false, strategy: "merge", mergeKey: "user_id" },
  { name: "protected_links", pgQuoted: false, strategy: "ignore" },
  { name: "default_settings", pgQuoted: false, strategy: "merge", mergeKey: "key" },
  { name: "user_settings", pgQuoted: false, strategy: "merge", mergeKey: ["user_id", "key"] },
  { name: "_migrations", pgQuoted: false, strategy: "ignore" },
];

function decodePrismaPostgresUrl(prismaUrl) {
  try {
    const u = new URL(prismaUrl);
    const apiKey = u.searchParams.get("api_key");
    if (!apiKey) return null;
    const json = Buffer.from(apiKey, "base64").toString("utf8");
    const data = JSON.parse(json);
    return data.databaseUrl || data.shadowDatabaseUrl || null;
  } catch {
    return null;
  }
}

function getPostgresUrl() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;

  if (oldUrl && (oldUrl.startsWith("postgres://") || oldUrl.startsWith("postgresql://"))) {
    return oldUrl;
  }
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    return dbUrl;
  }
  if (dbUrl && dbUrl.startsWith("prisma+postgres://")) {
    const direct = decodePrismaPostgresUrl(dbUrl);
    if (direct) return direct;
  }

  if (!oldUrl && !dbUrl) {
    throw new Error("OLD_DATABASE_URL or DATABASE_URL required");
  }
  throw new Error(
    "Could not get Postgres URL. Use OLD_DATABASE_URL with direct postgres:// URL, or DATABASE_URL with postgres:// or prisma+postgres:// (with api_key)"
  );
}

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

function escapeMysqlIdentifier(name) {
  return "`" + String(name).replace(/`/g, "``") + "`";
}

async function tableExists(pgClient, tableName, pgQuoted) {
  try {
    const q = pgQuoted ? `"${tableName}"` : tableName;
    await pgClient.query(`SELECT 1 FROM ${q} LIMIT 0`);
    return true;
  } catch (e) {
    if (e.code === "42P01" || e.message?.includes("does not exist")) return false;
    try {
      await pgClient.query(`SELECT 1 FROM "${tableName}" LIMIT 0`);
      return true;
    } catch {
      return false;
    }
  }
}

async function getPgColumns(pgClient, tableName, pgQuoted) {
  const q = pgQuoted ? `"${tableName}"` : tableName;
  const r = await pgClient.query(`SELECT * FROM ${q} LIMIT 0`);
  return r.fields.map((f) => f.name);
}

async function getExistingIds(mysqlConn, tableName, idColumn) {
  const [rows] = await mysqlConn.execute(`SELECT ${escapeMysqlIdentifier(idColumn)} FROM ${escapeMysqlIdentifier(tableName)}`);
  return new Set(rows.map((r) => String(r[idColumn])));
}

async function migrateTable(pgClient, mysqlConn, table, stats) {
  const { name, pgQuoted, strategy } = table;
  const pgTable = pgQuoted ? `"${name}"` : name;
  const mysqlTable = escapeMysqlIdentifier(name);

  const exists = await tableExists(pgClient, name, pgQuoted);
  if (!exists) {
    console.log(`  [SKIP] ${name} - table does not exist in Postgres`);
    return;
  }

  const columns = await getPgColumns(pgClient, name, pgQuoted);
  if (columns.length === 0) {
    console.log(`  [SKIP] ${name} - no columns`);
    return;
  }

  const limitClause = ROW_LIMIT ? ` LIMIT ${ROW_LIMIT}` : "";
  const r = await pgClient.query(`SELECT * FROM ${pgTable}${limitClause}`);
  const rows = r.rows;
  stats.read = rows.length;

  if (rows.length === 0) {
    console.log(`  [OK] ${name} - 0 rows (nothing to migrate)`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] ${name} - would migrate ${rows.length} rows`);
    stats.wouldInsert = rows.length;
    return;
  }

  let existingIds = null;
  if (strategy === "skip_exists") {
    const idCol = ["requests", "comments"].includes(name) ? "id" : "id";
    try {
      existingIds = await getExistingIds(mysqlConn, name, idCol);
    } catch (e) {
      console.warn(`  [WARN] ${name} - could not fetch existing IDs:`, e.message);
    }
  }

  const colsEscaped = columns.map((c) => escapeMysqlIdentifier(c));
  const placeholders = columns.map(() => "?").join(", ");
  const insertSql = `INSERT INTO ${mysqlTable} (${colsEscaped.join(", ")}) VALUES (${placeholders})`;

  let mergeSql = null;
  if (strategy === "merge" && table.mergeKey) {
    const keys = Array.isArray(table.mergeKey) ? table.mergeKey : [table.mergeKey];
    const updateCols = columns.filter((c) => !keys.includes(c));
    if (updateCols.length > 0) {
      const updates = updateCols.map((c) => `${escapeMysqlIdentifier(c)} = VALUES(${escapeMysqlIdentifier(c)})`).join(", ");
      mergeSql = `ON DUPLICATE KEY UPDATE ${updates}`;
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      if (strategy === "skip_exists" && existingIds && existingIds.has(String(row.id))) {
        skipped++;
        continue;
      }

      const values = columns.map((col) => toMysqlValue(row[col]));
      let sql = insertSql;
      if (strategy === "ignore") {
        sql = `INSERT IGNORE INTO ${mysqlTable} (${colsEscaped.join(", ")}) VALUES (${placeholders})`;
      } else if (mergeSql) {
        sql = `${insertSql} ${mergeSql}`;
      }

      try {
        await mysqlConn.execute(sql, values);
        inserted++;
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY" || e.errno === 1062) {
          skipped++;
        } else {
          throw e;
        }
      }
    }
  }

  stats.inserted = inserted;
  stats.skipped = skipped;
  console.log(`  [OK] ${name} - read ${stats.read}, inserted ${inserted}, skipped ${skipped}`);
}

async function main() {
  console.log("Prisma Postgres -> MySQL Migration");
  console.log("====================================");
  if (DRY_RUN) console.log("(DRY RUN - no writes)");
  if (ROW_LIMIT) console.log(`(Row limit: ${ROW_LIMIT} per table)`);

  const pgUrl = getPostgresUrl();
  const mysqlConfig = getMysqlConfig();

  const pgClient = new pg.Client({ connectionString: pgUrl });
  await pgClient.connect();
  console.log("Connected to Postgres");

  const mysqlConn = await mysql.createConnection(mysqlConfig);
  console.log("Connected to MySQL:", mysqlConfig.database);

  const totalStats = { read: 0, inserted: 0, skipped: 0, wouldInsert: 0 };

  for (const table of TABLES) {
    const stats = { read: 0, inserted: 0, skipped: 0, wouldInsert: 0 };
    try {
      await migrateTable(pgClient, mysqlConn, table, stats);
      totalStats.read += stats.read;
      totalStats.inserted += stats.inserted;
      totalStats.skipped += stats.skipped;
      totalStats.wouldInsert += stats.wouldInsert || 0;
    } catch (e) {
      console.error(`  [ERROR] ${table.name}:`, e.message);
    }
  }

  await pgClient.end();
  await mysqlConn.end();

  console.log("\nDone.");
  if (DRY_RUN) {
    console.log(`Would have migrated ${totalStats.wouldInsert} rows across tables.`);
  } else {
    console.log(`Total: ${totalStats.read} read, ${totalStats.inserted} inserted, ${totalStats.skipped} skipped.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
